import * as vscode from 'vscode';
import * as path from 'path';
import * as fs from 'fs-extra';
import { LoomTreeProvider, TreeNode } from '../tree/treeProvider';

export async function deleteItemCommand(treeProvider: LoomTreeProvider, node?: TreeNode): Promise<void> {
    if (!node) return;

    const workspaceRoot = vscode.workspace.workspaceFolders?.[0]?.uri.fsPath;
    if (!workspaceRoot) return;

    const label = (node.label as string) || node.doc?.id || node.threadId || node.weaveId || 'item';
    const confirmed = await vscode.window.showWarningMessage(
        `Delete '${label}'? This cannot be undone.`,
        { modal: true },
        'Delete'
    );
    if (confirmed !== 'Delete') return;

    const filePath = (node.doc as any)?._path as string | undefined;
    if (filePath) {
        await fs.remove(filePath);
    } else if (node.contextValue === 'thread' && node.weaveId && node.threadId) {
        await fs.remove(path.join(workspaceRoot, 'weaves', node.weaveId, node.threadId));
    } else if (node.contextValue === 'weave' && node.weaveId) {
        await fs.remove(path.join(workspaceRoot, 'weaves', node.weaveId));
    } else {
        vscode.window.showErrorMessage('Cannot determine what to delete.');
        return;
    }

    treeProvider.refresh();
}
