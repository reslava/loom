import * as vscode from 'vscode';
import * as path from 'path';
import * as fs from 'fs-extra';
import { LoomTreeProvider, TreeNode } from '../tree/treeProvider';

export async function threadCreateCommand(
    treeProvider: LoomTreeProvider,
    treeView: vscode.TreeView<TreeNode>
): Promise<void> {
    const workspaceRoot = vscode.workspace.workspaceFolders?.[0]?.uri.fsPath;
    if (!workspaceRoot) {
        vscode.window.showErrorMessage('No workspace open.');
        return;
    }

    const selectedNode = treeView.selection[0] as TreeNode | undefined;
    const weaveId = selectedNode?.weaveId ?? await vscode.window.showInputBox({
        prompt: 'Weave ID to create thread in',
        placeHolder: 'e.g., payment-system',
    });
    if (!weaveId) return;

    const threadId = await vscode.window.showInputBox({
        prompt: `Thread ID (in '${weaveId}')`,
        placeHolder: 'e.g., auth-flow',
        validateInput: v => /^[a-z0-9]+(-[a-z0-9]+)*$/.test(v) ? null : 'Use kebab-case (lowercase, hyphens)',
    });
    if (!threadId) return;

    const threadPath = path.join(workspaceRoot, 'weaves', weaveId, threadId);
    if (await fs.pathExists(threadPath)) {
        vscode.window.showWarningMessage(`Thread '${threadId}' already exists in '${weaveId}'.`);
        return;
    }

    await fs.ensureDir(threadPath);
    treeProvider.refresh();
}
