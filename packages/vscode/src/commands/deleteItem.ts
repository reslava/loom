import * as vscode from 'vscode';
import { getMCP } from '../mcp-client';
import { LoomTreeProvider, TreeNode } from '../tree/treeProvider';

export async function deleteItemCommand(treeProvider: LoomTreeProvider, node?: TreeNode): Promise<void> {
    if (!node) return;

    const root = vscode.workspace.workspaceFolders?.[0]?.uri.fsPath;
    if (!root) return;

    const label = (node.label as string) || node.doc?.id || node.threadId || node.weaveId || 'item';
    const confirmed = await vscode.window.showWarningMessage(
        `Delete '${label}'? This cannot be undone.`,
        { modal: true },
        'Delete'
    );
    if (confirmed !== 'Delete') return;

    // loom.delete is wired (package.json when-clause) to live items only, so a
    // doc id / weave / thread is always a live target.
    let args: Record<string, unknown>;
    if (node.doc?.id) {
        args = { id: node.doc.id };
    } else if (node.weaveId && node.threadId) {
        args = { weaveId: node.weaveId, threadId: node.threadId };
    } else if (node.weaveId) {
        args = { weaveId: node.weaveId };
    } else {
        vscode.window.showErrorMessage('Cannot determine what to delete.');
        return;
    }

    try {
        await getMCP(root).callTool('loom_delete', args);
        treeProvider.refresh();
    } catch (e: any) {
        vscode.window.showErrorMessage(`Delete failed: ${e.message}`);
    }
}
