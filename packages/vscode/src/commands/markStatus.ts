import * as vscode from 'vscode';
import { getMCP } from '../mcp-client';
import { LoomTreeProvider, TreeNode } from '../tree/treeProvider';

async function setDocStatus(
    treeProvider: LoomTreeProvider,
    treeView: vscode.TreeView<TreeNode>,
    node: TreeNode | undefined,
    status: 'done' | 'active'
): Promise<void> {
    const root = vscode.workspace.workspaceFolders?.[0]?.uri.fsPath;
    if (!root) { vscode.window.showErrorMessage('No workspace open.'); return; }

    const resolved = node ?? treeView.selection[0] as TreeNode | undefined;
    const docId = resolved?.doc?.id;
    if (!docId) { vscode.window.showErrorMessage('Select a document node first.'); return; }

    try {
        // The single guarded status verb. It refuses transitions a dedicated tool owns
        // (e.g. a plan → done needs Close Plan) with a clear message — surface it as-is.
        await getMCP(root).callTool('loom_set_status', { doc_ulid: docId, status });
        treeProvider.refresh();
    } catch (e: any) {
        vscode.window.showErrorMessage(`Failed to set status "${status}": ${e.message}`);
    }
}

export function setStatusDoneCommand(treeProvider: LoomTreeProvider, treeView: vscode.TreeView<TreeNode>, node?: TreeNode): Promise<void> {
    return setDocStatus(treeProvider, treeView, node, 'done');
}

export function setStatusActiveCommand(treeProvider: LoomTreeProvider, treeView: vscode.TreeView<TreeNode>, node?: TreeNode): Promise<void> {
    return setDocStatus(treeProvider, treeView, node, 'active');
}
