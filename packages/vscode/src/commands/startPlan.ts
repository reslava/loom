import * as vscode from 'vscode';
import { getMCP } from '../mcp-client';
import { LoomTreeProvider, TreeNode } from '../tree/treeProvider';
import { handleMcpError } from '../mcpErrorUtils';

export async function startPlanCommand(treeProvider: LoomTreeProvider, node?: TreeNode): Promise<void> {
    const root = vscode.workspace.workspaceFolders?.[0]?.uri.fsPath;
    if (!root) { vscode.window.showErrorMessage('No workspace open.'); return; }

    const planId = node?.doc?.id ?? await vscode.window.showInputBox({ prompt: 'Plan ULID to start', placeHolder: 'e.g., pl_01J…' });
    if (!planId) return;

    try {
        await getMCP(root).callTool('loom_start_plan', { plan_ulid: planId });
        vscode.window.showInformationMessage(`🧵 Plan started: ${planId}`);
        treeProvider.refresh();
    } catch (e: any) {
        handleMcpError(e, treeProvider);
    }
}
