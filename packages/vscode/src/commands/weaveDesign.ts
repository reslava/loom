import * as vscode from 'vscode';
import { getMCP } from '../mcp-client';
import { LoomTreeProvider, TreeNode } from '../tree/treeProvider';

export async function weaveDesignCommand(treeProvider: LoomTreeProvider, node?: TreeNode): Promise<void> {
    const root = vscode.workspace.workspaceFolders?.[0]?.uri.fsPath;
    if (!root) { vscode.window.showErrorMessage('No workspace open.'); return; }

    const weaveId = node?.weaveId ?? await vscode.window.showInputBox({ prompt: 'Weave ID', placeHolder: 'e.g., payment-system' });
    if (!weaveId) return;

    let threadId = node?.threadId;
    if (!threadId) {
        threadId = await vscode.window.showInputBox({ prompt: 'Thread ID (optional)', placeHolder: 'e.g., state-management — leave blank for loose design' }) || undefined;
    }

    const title = await vscode.window.showInputBox({ prompt: 'Design title (optional)', placeHolder: 'Leave blank to use idea title or thread ID' }) || undefined;

    try {
        const result = await getMCP(root).callTool('loom_create_design', { weaveId, threadId, title }) as any;
        vscode.window.showInformationMessage(`🧵 Design woven: ${result.id}`);
        treeProvider.refresh();
    } catch (e: any) {
        vscode.window.showErrorMessage(`Failed to weave design: ${e.message}`);
    }
}
