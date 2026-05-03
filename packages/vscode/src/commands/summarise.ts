import * as vscode from 'vscode';
import { getMCP } from '../mcp-client';
import { LoomTreeProvider, TreeNode } from '../tree/treeProvider';

export async function summariseCommand(treeProvider: LoomTreeProvider, node?: TreeNode): Promise<void> {
    const root = vscode.workspace.workspaceFolders?.[0]?.uri.fsPath;
    if (!root) {
        vscode.window.showErrorMessage('No workspace open.');
        return;
    }

    const weaveId = node?.weaveId ?? await vscode.window.showInputBox({
        prompt: 'Weave ID to summarise',
        placeHolder: 'e.g., payment-system',
    });
    if (!weaveId) return;

    try {
        let result: any;
        await vscode.window.withProgress(
            { location: vscode.ProgressLocation.Notification, title: 'Loom: Summarising weave…', cancellable: false },
            async () => {
                result = await getMCP(root).callTool('loom_summarise', { weaveId, force: false });
            }
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
