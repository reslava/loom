import * as vscode from 'vscode';
import { getMCP } from '../mcp-client';
import { LoomTreeProvider, TreeNode } from '../tree/treeProvider';
import { isClaudeInstalled, launchClaude } from './claudeTerminal';

export async function summariseCommand(treeProvider: LoomTreeProvider, node?: TreeNode): Promise<void> {
    const root = vscode.workspace.workspaceFolders?.[0]?.uri.fsPath;
    if (!root) { vscode.window.showErrorMessage('No workspace open.'); return; }

    const weaveId = node?.weaveId ?? await vscode.window.showInputBox({
        prompt: 'Weave ID to summarise',
        placeHolder: 'e.g., payment-system',
    });
    if (!weaveId) return;

    if (await isClaudeInstalled()) {
        await launchClaude(root, `Loom: Summarise`,
            `Loom summarise weave task. weaveId="${weaveId}". Use the loom MCP server: read all thread docs in this weave via loom://state or loom://context/thread/{weaveId}/{threadId} resources, write a concise ctx summary, then use MCP tool loom_update_doc on the weave ctx doc. Do not use loom_summarise — sampling is unavailable in Claude Code CLI.`
        );
    } else {
        try {
            let result: any;
            await vscode.window.withProgress(
                { location: vscode.ProgressLocation.Notification, title: 'Loom: Summarising weave…', cancellable: false },
                async () => { result = await getMCP(root).callTool('loom_summarise', { weaveId, force: false }); }
            );
            treeProvider.refresh();
            if (result?.generated && result?.ctxPath) {
                const doc = await vscode.workspace.openTextDocument(result.ctxPath);
                await vscode.window.showTextDocument(doc);
                vscode.window.showInformationMessage(`Context summary generated: ${weaveId}-ctx.md`);
            } else {
                vscode.window.showInformationMessage(`Context summary is up to date: ${weaveId}-ctx.md`);
            }
        } catch (e: any) {
            vscode.window.showErrorMessage(`Failed to summarise: ${e.message}`);
        }
    }
}
