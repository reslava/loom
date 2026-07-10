import * as vscode from 'vscode';
import * as path from 'path';
import { getMCP } from '../mcp-client';
import { LoomTreeProvider, TreeNode } from '../tree/treeProvider';

export async function deleteItemCommand(treeProvider: LoomTreeProvider, node?: TreeNode): Promise<void> {
    if (!node) return;

    const root = vscode.workspace.workspaceFolders?.[0]?.uri.fsPath;
    if (!root) return;

    const label = (node.label as string) || node.doc?.id || node.threadSlug || node.weaveSlug || 'item';

    // An archived doc (a reference under .archive/) isn't in the live index — delete it
    // by its path under loom/.archive/. Live docs delete by id; folders (live or archived
    // weave/thread) by weave/thread — removeItem targets .archive/ when the live path is gone.
    let args: Record<string, unknown>;
    const filePath = (node.doc as any)?._path as string | undefined;
    const archivePrefix = path.join(root, 'loom', '.archive') + path.sep;
    if (node.doc?.id && filePath?.startsWith(archivePrefix)) {
        args = { archived_rel_path: filePath.slice(archivePrefix.length) };
    } else if (node.doc?.id) {
        args = { doc_ulid: node.doc.id };
    } else if (node.weaveSlug && node.threadSlug) {
        args = { weave_slug: node.weaveSlug, thread_slug: node.threadSlug };
    } else if (node.weaveSlug) {
        args = { weave_slug: node.weaveSlug };
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
