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
    const weaveSlug = selectedNode?.weaveSlug ?? await vscode.window.showInputBox({
        prompt: 'Weave ID to create thread in',
        placeHolder: 'e.g., payment-system',
    });
    if (!weaveSlug) return;

    const threadSlug = await vscode.window.showInputBox({
        prompt: `Thread ID (in '${weaveSlug}')`,
        placeHolder: 'e.g., auth-flow',
        validateInput: v => /^[a-z0-9]+(-[a-z0-9]+)*$/.test(v) ? null : 'Use kebab-case (lowercase, hyphens)',
    });
    if (!threadSlug) return;

    try {
        // loom_create_thread writes the thread.md manifest via the app use-case —
        // this is what was missing when the command created the folder with raw fs.
        await getMCP(root).callTool('loom_create_thread', { weave_slug: weaveSlug, thread_slug: threadSlug });
        await treeProvider.waitForRefresh();
        const threadNode = treeProvider.getNodeByThreadId(weaveSlug, threadSlug);
        if (threadNode) treeView.reveal(threadNode, { select: true, focus: true, expand: false });
    } catch (e: any) {
        vscode.window.showErrorMessage(`Failed to create thread: ${e.message}`);
    }
}
