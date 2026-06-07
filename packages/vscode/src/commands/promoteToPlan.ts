import * as vscode from 'vscode';
import { getMCP } from '../mcp-client';
import { LoomTreeProvider, TreeNode } from '../tree/treeProvider';
import { isClaudeInstalled, launchClaude } from './claudeTerminal';

export async function promoteToPlanCommand(treeProvider: LoomTreeProvider, node?: TreeNode): Promise<void> {
    const root = vscode.workspace.workspaceFolders?.[0]?.uri.fsPath;
    if (!root) { vscode.window.showErrorMessage('No workspace open.'); return; }

    const sourceId = node?.doc?.id;
    if (!sourceId) { vscode.window.showErrorMessage('Right-click a chat, idea, or design in the tree to promote it.'); return; }

    const toolArgs: Record<string, unknown> = { sourceId, targetType: 'plan' };

    const targetWeaveId = node?.weaveId ?? await vscode.window.showInputBox({ prompt: 'Target weave ID', placeHolder: 'e.g., my-feature' });
    if (!targetWeaveId) return;
    toolArgs['targetWeaveId'] = targetWeaveId;

    let targetThreadId = node?.threadId;
    if (!targetThreadId) {
        const input = await vscode.window.showInputBox({ prompt: 'Target thread ID (leave blank for weave-level)', placeHolder: 'e.g., auth-flow' });
        if (input === undefined) return;
        targetThreadId = input || undefined;
    }
    if (targetThreadId) toolArgs['targetThreadId'] = targetThreadId;

    if (await isClaudeInstalled()) {
        const sourceFilePath = (node?.doc as any)?._path as string | undefined;
        const readInstruction = sourceFilePath
            ? `Read the source file at "${sourceFilePath}" using the Read tool (not Bash, not loom_find_doc).`
            : `Use MCP tool loom_find_doc with id="${sourceId}" to get the file path, then read it with the Read tool.`;
        const threadArg = targetThreadId ? `, threadId="${targetThreadId}"` : '';
        const reqInstruction = targetThreadId
            ? `Also read the thread's req.md (at loom/${targetWeaveId}/${targetThreadId}/req.md) — its ✅ Included / ❌ Excluded / ⛓ Constraints carry stable IN/EX/C ids. Treat every ❌ Excluded item and ⛓ Constraint as a HARD BOUNDARY (never add excluded work), and ensure every ✅ Included item is advanced by at least one step. `
            : '';
        const satisfiesInstruction = targetThreadId
            ? `Fill each step's Satisfies cell with the IN/C ids that step advances (use — when none; NEVER cite an EX id). `
            : `Leave each step's Satisfies cell as — (no req in this scope). `;
        await launchClaude(root, `Loom: Promote to Plan`,
            [
                `Loom promote to plan task. sourceId="${sourceId}", targetWeaveId="${targetWeaveId}"${targetThreadId ? `, targetThreadId="${targetThreadId}"` : ''}.`,
                readInstruction,
                reqInstruction,
                `Then call MCP tool loom_create_plan ONCE with weaveId="${targetWeaveId}"${threadArg}, a concise title, and a full markdown \`content\` body (no frontmatter) containing a "## Goal" section and a "## Steps" section.`,
                `The Steps section MUST be a 6-column table with this exact header: | Done | # | Step | Files touched | Blocked by | Satisfies |. One row per concrete deliverable, in order; Done starts as 🔳; use — for empty Files touched / Blocked by cells.`,
                satisfiesInstruction,
                `Pass this whole body as the \`content\` argument — loom_create_plan parses the Satisfies column into the plan's steps. Do NOT pass the \`steps\` array (strings can't carry Satisfies) and do NOT call loom_update_doc afterwards.`,
                `Do not use loom_promote — sampling is unavailable in Claude Code CLI. Do not invoke CLI commands via Bash.`,
            ].join(' ')
        );
    } else {
        try {
            let result: any;
            await vscode.window.withProgress(
                { location: vscode.ProgressLocation.Notification, title: 'Loom: Promoting to plan…', cancellable: false },
                async () => { result = await getMCP(root).callTool('loom_promote', toolArgs); }
            );
            treeProvider.refresh();
            if (result?.filePath) {
                const doc = await vscode.workspace.openTextDocument(result.filePath);
                await vscode.window.showTextDocument(doc, { preview: false });
            }
            vscode.window.showInformationMessage(`Plan created from ${sourceId}`);
        } catch (e: any) {
            vscode.window.showErrorMessage(`Promote to plan failed: ${e.message}`);
        }
    }
}
