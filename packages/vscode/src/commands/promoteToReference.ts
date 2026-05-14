import * as vscode from 'vscode';
import { getMCP } from '../mcp-client';
import { LoomTreeProvider, TreeNode } from '../tree/treeProvider';

export async function promoteToReferenceCommand(treeProvider: LoomTreeProvider, node?: TreeNode): Promise<void> {
    const root = vscode.workspace.workspaceFolders?.[0]?.uri.fsPath;
    if (!root) { vscode.window.showErrorMessage('No workspace open.'); return; }

    const sourceDoc = node?.doc;
    if (!sourceDoc) {
        vscode.window.showErrorMessage('Right-click a refs chat to promote it to a reference.');
        return;
    }

    const titleInput = await vscode.window.showInputBox({
        prompt: 'Reference title',
        value: sourceDoc.title,
        placeHolder: 'e.g. Architecture',
    });
    if (titleInput === undefined) return;
    if (!titleInput) return;

    try {
        let result: any;
        const aiEnabled = (vscode.workspace.getConfiguration('reslava-loom.ai').get<string>('apiKey')?.length ?? 0) > 0;
        await vscode.window.withProgress(
            { location: vscode.ProgressLocation.Notification, title: 'Loom: Promoting to reference…', cancellable: false },
            async () => {
                result = await getMCP(root).callTool('loom_create_reference', { title: titleInput }) as any;
                if (aiEnabled && result?.id) {
                    try {
                        result = await getMCP(root).callTool('loom_generate_reference', { id: result.id }) as any;
                    } catch { /* sampling unavailable — leave empty body */ }
                }
            }
        );
        treeProvider.refresh();
        if (result?.filePath) {
            const doc = await vscode.workspace.openTextDocument(result.filePath);
            await vscode.window.showTextDocument(doc, { preview: false });
        }
        vscode.window.showInformationMessage(`Reference "${titleInput}" created.`);
    } catch (e: any) {
        vscode.window.showErrorMessage(`Promote to reference failed: ${e.message}`);
    }
}
