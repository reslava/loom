import * as vscode from 'vscode';
import { getMCP } from '../mcp-client';
import { LoomTreeProvider, TreeNode } from '../tree/treeProvider';

export async function weavePlanCommand(treeProvider: LoomTreeProvider, node?: TreeNode): Promise<void> {
    const root = vscode.workspace.workspaceFolders?.[0]?.uri.fsPath;
    if (!root) { vscode.window.showErrorMessage('No workspace open.'); return; }

    const weaveId = node?.weaveId ?? await vscode.window.showInputBox({ prompt: 'Weave ID', placeHolder: 'e.g., payment-system' });
    if (!weaveId) return;

    let threadId = node?.threadId;
    if (!threadId) {
        threadId = await vscode.window.showInputBox({ prompt: 'Thread ID (optional)', placeHolder: 'e.g., state-management — leave blank for loose plan' }) || undefined;
    }

    const parentId = node?.doc?.type === 'design' ? node.doc.id : undefined;
    const title = await vscode.window.showInputBox({ prompt: 'Plan title (optional)', placeHolder: 'Leave blank to use thread ID' }) || undefined;
    const goal = await vscode.window.showInputBox({ prompt: 'Goal (optional)', placeHolder: 'Brief description of what this plan implements' }) || undefined;

    try {
        const result = await getMCP(root).callTool('loom_create_plan', { weaveId, threadId, title, goal, parentId }) as any;
        vscode.window.showInformationMessage(`🧵 Plan woven: ${result.id}`);
        treeProvider.refresh();
    } catch (e: any) {
        vscode.window.showErrorMessage(`Failed to weave plan: ${e.message}`);
    }
}
