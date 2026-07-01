import * as vscode from 'vscode';
import { getMCP } from '../mcp-client';
import { LoomTreeProvider, TreeNode } from '../tree/treeProvider';

export async function deleteItemCommand(treeProvider: LoomTreeProvider, node?: TreeNode): Promise<void> {
    if (!node) return;

    const root = vscode.workspace.workspaceFolders?.[0]?.uri.fsPath;
    if (!root) return;

    const label = (node.label as string) || node.doc?.id || node.threadId || node.weaveId || 'item';

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

    // Archive-first: the recoverable option leads; permanent delete is the explicit,
    // second choice on a modal dialog.
    const choice = await vscode.window.showWarningMessage(
        `Delete '${label}' permanently? This cannot be undone — Archive keeps it recoverable in loom/.archive/.`,
        { modal: true },
        'Archive instead',
        'Delete permanently'
    );
    if (choice !== 'Archive instead' && choice !== 'Delete permanently') return;

    try {
        const tool = choice === 'Archive instead' ? 'loom_archive' : 'loom_delete';
        await getMCP(root).callTool(tool, args);
        treeProvider.refresh();
    } catch (e: any) {
        vscode.window.showErrorMessage(`${choice === 'Archive instead' ? 'Archive' : 'Delete'} failed: ${e.message}`);
    }
}
