import * as vscode from 'vscode';
import { getMCP } from '../mcp-client';
import { LoomTreeProvider, TreeNode } from '../tree/treeProvider';

export async function threadCreateCommand(
    treeProvider: LoomTreeProvider,
    treeView: vscode.TreeView<TreeNode>,
    node?: TreeNode
): Promise<void> {
    const root = vscode.workspace.workspaceFolders?.[0]?.uri.fsPath;
    if (!root) { vscode.window.showErrorMessage('No workspace open.'); return; }

    const selectedNode = node ?? treeView.selection[0] as TreeNode | undefined;
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

    try {
        // loom_create_thread writes the thread.md manifest via the app use-case —
        // this is what was missing when the command created the folder with raw fs.
        await getMCP(root).callTool('loom_create_thread', { weave_slug: weaveId, thread_slug: threadId });
        await treeProvider.waitForRefresh();
        const threadNode = treeProvider.getNodeByThreadId(weaveId, threadId);
        if (threadNode) treeView.reveal(threadNode, { select: true, focus: true, expand: false });
    } catch (e: any) {
        vscode.window.showErrorMessage(`Failed to create thread: ${e.message}`);
    }
}
