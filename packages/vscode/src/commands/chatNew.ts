import * as vscode from 'vscode';
import { chatNew } from '@reslava-loom/app/dist/chatNew';
import { saveDoc } from '@reslava-loom/fs/dist';
import * as fs from 'fs-extra';
import { LoomTreeProvider, TreeNode } from '../tree/treeProvider';

export async function chatNewCommand(
    treeProvider: LoomTreeProvider,
    treeView: vscode.TreeView<TreeNode>,
    node?: TreeNode
): Promise<void> {
    const workspaceRoot = vscode.workspace.workspaceFolders?.[0]?.uri.fsPath;
    if (!workspaceRoot) {
        vscode.window.showErrorMessage('No workspace open.');
        return;
    }

    const selectedNode = node ?? treeView.selection[0] as TreeNode | undefined;
    const weaveId = selectedNode?.weaveId ?? await vscode.window.showInputBox({
        prompt: 'Weave ID for this chat',
        placeHolder: 'e.g., payment-system',
    });
    if (!weaveId) return;

    const threadId = selectedNode?.threadId;

    const title = await vscode.window.showInputBox({
        prompt: 'Chat title (optional)',
        placeHolder: 'Leave blank to use default',
    });

    try {
        const result = await chatNew(
            { weaveId, threadId, title: title || undefined },
            { loomRoot: workspaceRoot, saveDoc, fs }
        );
        const doc = await vscode.workspace.openTextDocument(result.filePath);
        await vscode.window.showTextDocument(doc);
        treeProvider.refresh();
    } catch (e: any) {
        vscode.window.showErrorMessage(`Failed to create chat: ${e.message}`);
    }
}
