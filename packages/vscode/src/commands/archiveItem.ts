import * as vscode from 'vscode';
import * as path from 'path';
import * as fs from 'fs-extra';
import { LoomTreeProvider, TreeNode } from '../tree/treeProvider';

export async function archiveItemCommand(treeProvider: LoomTreeProvider, node?: TreeNode): Promise<void> {
    if (!node) return;

    const workspaceRoot = vscode.workspace.workspaceFolders?.[0]?.uri.fsPath;
    if (!workspaceRoot) return;

    try {
        const filePath = (node.doc as any)?._path as string | undefined;
        if (filePath) {
            const archiveDir = path.join(path.dirname(filePath), '_archive');
            await fs.ensureDir(archiveDir);
            await fs.move(filePath, path.join(archiveDir, path.basename(filePath)), { overwrite: false });
        } else if (node.contextValue === 'thread' && node.weaveId && node.threadId) {
            const src = path.join(workspaceRoot, 'weaves', node.weaveId, node.threadId);
            const dst = path.join(workspaceRoot, 'weaves', node.weaveId, '_archive', node.threadId);
            await fs.ensureDir(path.dirname(dst));
            await fs.move(src, dst, { overwrite: false });
        } else if (node.contextValue === 'weave' && node.weaveId) {
            const src = path.join(workspaceRoot, 'weaves', node.weaveId);
            const dst = path.join(workspaceRoot, 'weaves', '_archive', node.weaveId);
            await fs.ensureDir(path.dirname(dst));
            await fs.move(src, dst, { overwrite: false });
        } else {
            vscode.window.showErrorMessage('Cannot determine what to archive.');
            return;
        }
        treeProvider.refresh();
    } catch (e: any) {
        vscode.window.showErrorMessage(`Archive failed: ${e.message}`);
    }
}
