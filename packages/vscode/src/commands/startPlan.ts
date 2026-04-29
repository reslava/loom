import * as vscode from 'vscode';
import { getMCP } from '../mcp-client';
import { LoomTreeProvider, TreeNode } from '../tree/treeProvider';

export async function startPlanCommand(treeProvider: LoomTreeProvider, node?: TreeNode): Promise<void> {
    const root = vscode.workspace.workspaceFolders?.[0]?.uri.fsPath;
    if (!root) { vscode.window.showErrorMessage('No workspace open.'); return; }

    const planId = node?.doc?.id ?? await vscode.window.showInputBox({ prompt: 'Plan ID to start', placeHolder: 'e.g., payment-system-plan-001' });
    if (!planId) return;

    try {
        await getMCP(root).callTool('loom_start_plan', { planId });
        vscode.window.showInformationMessage(`🧵 Plan started: ${planId}`);
        treeProvider.refresh();
    } catch (e: any) {
        vscode.window.showErrorMessage(`Failed to start plan: ${e.message}`);
    }
}
