import * as vscode from 'vscode';
import { getMCP } from '../mcp-client';
import { LoomTreeProvider, TreeNode } from '../tree/treeProvider';
import { handleMcpError } from '../mcpErrorUtils';
import { isClaudeInstalled, launchClaude } from './claudeTerminal';

export async function refinePlanCommand(treeProvider: LoomTreeProvider, node?: TreeNode): Promise<void> {
    const root = vscode.workspace.workspaceFolders?.[0]?.uri.fsPath;
    if (!root) { vscode.window.showErrorMessage('No workspace open.'); return; }

    const id = node?.doc?.id;
    if (!id) { vscode.window.showErrorMessage('Right-click a plan in the tree to refine it.'); return; }

    if (await isClaudeInstalled()) {
        const filePath = (node?.doc as any)?._path as string | undefined;
        const readInstruction = filePath
            ? `Read the plan file at "${filePath}" using the Read tool (not Bash, not loom_find_doc).`
            : `Use MCP tool loom_find_doc with id="${id}" to get the file path, then read it with the Read tool.`;
        await launchClaude(root, `Loom: Refine Plan`,
            `Loom refine plan task. planId="${id}". ${readInstruction} Also read its parent design, and the thread's req.md (it sits in the plan's thread folder, one level up from plans/) — its ✅ Included / ❌ Excluded / ⛓ Constraints carry IN/EX/C ids. Update the plan steps table to reflect the current design AND honour the req: keep the 6-column table (Done | # | Step | Files touched | Blocked by | Satisfies); treat every ❌ Excluded item and ⛓ Constraint as a HARD BOUNDARY (never add excluded work); ensure each ✅ Included item is advanced by at least one step; and fill each step's Satisfies cell with the IN/C ids it advances (— if none, never cite an EX id). Preserve the done (✅) status of completed steps. Then use MCP tool loom_update_doc with id="${id}" and updated body. Do not use loom_refine_plan — sampling is unavailable in Claude Code CLI. Do not invoke CLI commands via Bash.`
        );
    } else {
        try {
            let result: any;
            await vscode.window.withProgress(
                { location: vscode.ProgressLocation.Notification, title: 'Loom: Refining plan…', cancellable: false },
                async () => {
                    result = await getMCP(root).callTool('loom_refine_plan', { id });
                }
            );
            treeProvider.refresh();
            if (result?.filePath) {
                const doc = await vscode.workspace.openTextDocument(result.filePath);
                await vscode.window.showTextDocument(doc, { preview: false });
            }
            vscode.window.showInformationMessage(`Plan refined (v${result?.version})`);
        } catch (e: any) {
            handleMcpError(e, treeProvider);
        }
    }
}
