import * as vscode from 'vscode';
import { getMCP } from '../mcp-client';
import { TreeNode } from '../tree/treeProvider';

export async function chatReplyCommand(node?: TreeNode): Promise<void> {
    const root = vscode.workspace.workspaceFolders?.[0]?.uri.fsPath;
    if (!root) {
        vscode.window.showErrorMessage('No workspace open.');
        return;
    }

    const chatId = node?.doc?.id;
    if (!chatId) {
        vscode.window.showErrorMessage('Select a chat document in the Loom tree first.');
        return;
    }

    const filePath = (node!.doc as any)._path as string | undefined;
    if (filePath) {
        const doc = await vscode.workspace.openTextDocument(filePath);
        await vscode.window.showTextDocument(doc, { preview: false, preserveFocus: true });
        await doc.save();
    }

    try {
        await vscode.window.withProgress(
            { location: vscode.ProgressLocation.Notification, title: 'Loom: AI thinking…', cancellable: false },
            async () => {
                const mcp = getMCP(root);
                await mcp.callTool('loom_generate_chat_reply', { chatId });
            }
        );

        if (filePath) {
            const updated = await vscode.workspace.openTextDocument(filePath);
            await vscode.window.showTextDocument(updated, { preview: false, preserveFocus: false });
        }
    } catch (e: any) {
        vscode.window.showErrorMessage(`Chat reply failed: ${e.message}`);
    }
}
