import * as vscode from 'vscode';
import * as path from 'path';
import { getMCP } from '../mcp-client';
import { LoomTreeProvider, TreeNode } from '../tree/treeProvider';

export async function restoreItemCommand(treeProvider: LoomTreeProvider, node?: TreeNode): Promise<void> {
    if (!node) return;

    const root = vscode.workspace.workspaceFolders?.[0]?.uri.fsPath;
    if (!root) return;

    // Archived folders are addressed by weave/thread; an archived doc is addressed
    // by its path relative to loom/.archive/ (archived docs aren't in the live index).
    let args: Record<string, unknown>;
    if (node.weaveSlug && node.threadSlug && !node.doc) {
        args = { weave_slug: node.weaveSlug, thread_slug: node.threadSlug };
    } else if (node.weaveSlug && !node.doc) {
        args = { weave_slug: node.weaveSlug };
    } else {
        const filePath = (node.doc as any)?._path as string | undefined;
        if (!filePath) { vscode.window.showErrorMessage('Cannot determine what to restore.'); return; }
        const archivePrefix = path.join(root, 'loom', '.archive') + path.sep;
        if (!filePath.startsWith(archivePrefix)) { vscode.window.showErrorMessage('Item is not in the archive.'); return; }
        args = { archived_rel_path: filePath.slice(archivePrefix.length) };
    }

    try {
        await getMCP(root).callTool('loom_restore', args);
        treeProvider.refresh();
    } catch (e: any) {
        vscode.window.showErrorMessage(`Restore failed: ${e.message}`);
    }
}
