import * as vscode from 'vscode';
import { getMCP } from '../mcp-client';
import { LoomTreeProvider, TreeNode } from '../tree/treeProvider';

export async function promoteToIdeaCommand(treeProvider: LoomTreeProvider, node?: TreeNode): Promise<void> {
    const root = vscode.workspace.workspaceFolders?.[0]?.uri.fsPath;
    if (!root) { vscode.window.showErrorMessage('No workspace open.'); return; }

    const sourceId = node?.doc?.id;
    if (!sourceId) {
        vscode.window.showErrorMessage('Right-click a chat or doc in the tree to promote it.');
        return;
    }

    const toolArgs: Record<string, unknown> = { sourceId, targetType: 'idea' };

    if (!node?.weaveId) {
        const targetWeaveId = await vscode.window.showInputBox({ prompt: 'Target weave ID', placeHolder: 'e.g., my-feature' });
        if (!targetWeaveId) return;
        toolArgs['targetWeaveId'] = targetWeaveId;
    } else {
        toolArgs['targetWeaveId'] = node.weaveId;
    }

    if (!node?.threadId) {
        const targetThreadId = await vscode.window.showInputBox({ prompt: 'Target thread ID (leave blank for weave-level)', placeHolder: 'e.g., auth-flow' });
        if (targetThreadId === undefined) return;
        if (targetThreadId) toolArgs['targetThreadId'] = targetThreadId;
    } else {
        toolArgs['targetThreadId'] = node.threadId;
    }

    try {
        let result: any;
        await vscode.window.withProgress(
            { location: vscode.ProgressLocation.Notification, title: 'Loom: Promoting to idea…', cancellable: false },
            async () => {
                result = await getMCP(root).callTool('loom_promote', toolArgs);
            }
        );
        treeProvider.refresh();
        if (result?.filePath) {
            const doc = await vscode.workspace.openTextDocument(result.filePath);
            await vscode.window.showTextDocument(doc, { preview: false });
        }
        vscode.window.showInformationMessage(`Idea created from ${sourceId}`);
    } catch (e: any) {
        vscode.window.showErrorMessage(`Promote to idea failed: ${e.message}`);
    }
}
