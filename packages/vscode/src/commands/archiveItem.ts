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
        args = { doc_ulid: node.doc.id };
    } else if (node.weaveSlug && node.threadSlug) {
        args = { weave_slug: node.weaveSlug, thread_slug: node.threadSlug };
    } else if (node.weaveSlug) {
        args = { weave_slug: node.weaveSlug };
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
