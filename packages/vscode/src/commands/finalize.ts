import * as vscode from 'vscode';
import { getMCP } from '../mcp-client';
import { LoomTreeProvider, TreeNode } from '../tree/treeProvider';

export async function finalizeCommand(treeProvider: LoomTreeProvider, node?: TreeNode): Promise<void> {
    const root = vscode.workspace.workspaceFolders?.[0]?.uri.fsPath;
    if (!root) { vscode.window.showErrorMessage('No workspace open.'); return; }

    const prefilledId = node?.doc?.status === 'draft' ? node.doc.id : undefined;
    const id = prefilledId ?? await vscode.window.showInputBox({ prompt: 'Draft document ID to finalize', placeHolder: 'e.g., payment-system-idea' });
    if (!id) return;

    try {
        const result = await getMCP(root).callTool('loom_finalize_doc', { id }) as any;
        vscode.window.showInformationMessage(`🧵 Finalized "${result.id}" (status: active)`);
        treeProvider.refresh();
    } catch (e: any) {
        vscode.window.showErrorMessage(`Failed to finalize: ${e.message}`);
    }
}
