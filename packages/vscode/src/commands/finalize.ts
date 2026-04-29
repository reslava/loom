import * as vscode from 'vscode';
import { getMCP } from '../mcp-client';
import { LoomTreeProvider, TreeNode } from '../tree/treeProvider';

export async function finalizeCommand(treeProvider: LoomTreeProvider, node?: TreeNode): Promise<void> {
    const root = vscode.workspace.workspaceFolders?.[0]?.uri.fsPath;
    if (!root) { vscode.window.showErrorMessage('No workspace open.'); return; }

    const prefilledId = node?.doc?.id?.startsWith('new-') ? node.doc.id : undefined;
    const id = prefilledId ?? await vscode.window.showInputBox({ prompt: 'Temporary document ID to finalize', placeHolder: 'e.g., new-20260422084129-idea' });
    if (!id) return;

    try {
        const result = await getMCP(root).callTool('loom_finalize_doc', { id }) as any;
        vscode.window.showInformationMessage(`🧵 Finalized: ${result.oldId} → ${result.newId}`);
        treeProvider.refresh();
    } catch (e: any) {
        vscode.window.showErrorMessage(`Failed to finalize: ${e.message}`);
    }
}
