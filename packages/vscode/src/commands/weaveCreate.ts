import * as vscode from 'vscode';
import { getMCP } from '../mcp-client';
import { LoomTreeProvider, TreeNode } from '../tree/treeProvider';

export async function weaveCreateCommand(treeProvider: LoomTreeProvider, treeView: vscode.TreeView<TreeNode>): Promise<void> {
    const root = vscode.workspace.workspaceFolders?.[0]?.uri.fsPath;
    if (!root) { vscode.window.showErrorMessage('No workspace open.'); return; }

    const weaveId = await vscode.window.showInputBox({
        prompt: 'Weave ID',
        placeHolder: 'e.g., payment-system',
        validateInput: v => /^[a-z0-9]+(-[a-z0-9]+)*$/.test(v) ? null : 'Use kebab-case (lowercase, hyphens)',
    });
    if (!weaveId) return;

    try {
        await getMCP(root).callTool('loom_create_weave', { weaveId });
        await treeProvider.waitForRefresh();
        const node = treeProvider.getNodeByWeaveId(weaveId);
        if (node) treeView.reveal(node, { select: true, focus: true, expand: false });
    } catch (e: any) {
        vscode.window.showErrorMessage(`Failed to create weave: ${e.message}`);
    }
}
