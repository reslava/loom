import * as vscode from 'vscode';
import { getMCP } from '../mcp-client';
import { LoomTreeProvider } from '../tree/treeProvider';

export async function renameCommand(treeProvider: LoomTreeProvider, node?: any): Promise<void> {
    const root = vscode.workspace.workspaceFolders?.[0]?.uri.fsPath;
    if (!root) { vscode.window.showErrorMessage('No workspace open.'); return; }

    const oldId = node?.doc?.id ?? await vscode.window.showInputBox({ prompt: 'Document ID to rename', placeHolder: 'e.g., payment-system-design' });
    if (!oldId) return;

    const newTitle = await vscode.window.showInputBox({ prompt: 'New title', placeHolder: 'e.g., Payment Gateway Design' });
    if (!newTitle) return;

    try {
        const result = await getMCP(root).callTool('loom_rename', { oldId, newTitle }) as any;
        vscode.window.showInformationMessage(`🧵 Renamed: ${result.oldId} → ${result.newId} (${result.updatedCount} references updated)`);
        treeProvider.refresh();
    } catch (e: any) {
        vscode.window.showErrorMessage(`Failed to rename: ${e.message}`);
    }
}
