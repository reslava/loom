import * as vscode from 'vscode';
import { getMCP } from '../mcp-client';
import { LoomTreeProvider, TreeNode } from '../tree/treeProvider';

export async function archiveItemCommand(treeProvider: LoomTreeProvider, node?: TreeNode): Promise<void> {
    if (!node) return;

    const root = vscode.workspace.workspaceFolders?.[0]?.uri.fsPath;
    if (!root) return;

    // loom.archive is wired (package.json when-clause) to live items only.
    let args: Record<string, unknown>;
    if (node.doc?.id) {
        args = { id: node.doc.id };
    } else if (node.weaveId && node.threadId) {
        args = { weaveId: node.weaveId, threadId: node.threadId };
    } else if (node.weaveId) {
        args = { weaveId: node.weaveId };
    } else {
        vscode.window.showErrorMessage('Cannot determine what to archive.');
        return;
    }

    try {
        await getMCP(root).callTool('loom_archive', args);
        treeProvider.refresh();
    } catch (e: any) {
        vscode.window.showErrorMessage(`Archive failed: ${e.message}`);
    }
}
