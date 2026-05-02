import * as vscode from 'vscode';
import { getMCP } from '../mcp-client';
import { LoomTreeProvider, TreeNode } from '../tree/treeProvider';

export async function refineIdeaCommand(treeProvider: LoomTreeProvider, node?: TreeNode): Promise<void> {
    const root = vscode.workspace.workspaceFolders?.[0]?.uri.fsPath;
    if (!root) { vscode.window.showErrorMessage('No workspace open.'); return; }

    const id = node?.doc?.id;
    if (!id) {
        vscode.window.showErrorMessage('Right-click an idea in the tree to refine it.');
        return;
    }

    try {
        let result: any;
        await vscode.window.withProgress(
            { location: vscode.ProgressLocation.Notification, title: 'Loom: Refining idea…', cancellable: false },
            async () => {
                result = await getMCP(root).callTool('loom_refine_idea', { id });
            }
        );
        treeProvider.refresh();
        if (result?.filePath) {
            const doc = await vscode.workspace.openTextDocument(result.filePath);
            await vscode.window.showTextDocument(doc, { preview: false });
        }
        vscode.window.showInformationMessage(`Idea refined (v${result?.version})`);
    } catch (e: any) {
        vscode.window.showErrorMessage(`Refine idea failed: ${e.message}`);
    }
}
