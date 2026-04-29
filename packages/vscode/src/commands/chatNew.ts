import * as vscode from 'vscode';
import { getMCP } from '../mcp-client';
import { LoomTreeProvider, TreeNode } from '../tree/treeProvider';

export async function chatNewCommand(
    treeProvider: LoomTreeProvider,
    treeView: vscode.TreeView<TreeNode>,
    node?: TreeNode
): Promise<void> {
    const root = vscode.workspace.workspaceFolders?.[0]?.uri.fsPath;
    if (!root) { vscode.window.showErrorMessage('No workspace open.'); return; }

    const selectedNode = node ?? treeView.selection[0] as TreeNode | undefined;
    const weaveId = selectedNode?.weaveId ?? await vscode.window.showInputBox({ prompt: 'Weave ID for this chat', placeHolder: 'e.g., payment-system' });
    if (!weaveId) return;

    const threadId = selectedNode?.threadId;
    const title = await vscode.window.showInputBox({ prompt: 'Chat title (optional)', placeHolder: 'Leave blank to use default' }) || undefined;

    try {
        const result = await getMCP(root).callTool('loom_create_chat', { weaveId, threadId, title }) as any;
        if (result?.filePath) {
            const doc = await vscode.workspace.openTextDocument(result.filePath);
            await vscode.window.showTextDocument(doc);
        }
        treeProvider.refresh();
    } catch (e: any) {
        vscode.window.showErrorMessage(`Failed to create chat: ${e.message}`);
    }
}
