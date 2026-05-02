import * as vscode from 'vscode';
import { getMCP } from '../mcp-client';
import { LoomTreeProvider, TreeNode } from '../tree/treeProvider';

export async function promoteToPlanCommand(treeProvider: LoomTreeProvider, node?: TreeNode): Promise<void> {
    const root = vscode.workspace.workspaceFolders?.[0]?.uri.fsPath;
    if (!root) { vscode.window.showErrorMessage('No workspace open.'); return; }

    const sourceId = node?.doc?.id;
    if (!sourceId) {
        vscode.window.showErrorMessage('Right-click a chat, idea, or design in the tree to promote it.');
        return;
    }

    try {
        let result: any;
        await vscode.window.withProgress(
            { location: vscode.ProgressLocation.Notification, title: 'Loom: Promoting to plan…', cancellable: false },
            async () => {
                result = await getMCP(root).callTool('loom_promote', { sourceId, targetType: 'plan' });
            }
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
