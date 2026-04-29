import * as vscode from 'vscode';
import { getMCP } from '../mcp-client';
import { LoomTreeProvider, TreeNode } from '../tree/treeProvider';
import { PlanDoc } from '@reslava-loom/core/dist/entities/plan';

export async function completeStepCommand(treeProvider: LoomTreeProvider, node?: TreeNode): Promise<void> {
    const root = vscode.workspace.workspaceFolders?.[0]?.uri.fsPath;
    if (!root) { vscode.window.showErrorMessage('No workspace open.'); return; }

    const plan = node?.doc as PlanDoc | undefined;
    if (!plan || plan.type !== 'plan') { vscode.window.showErrorMessage('Select a plan node to complete steps.'); return; }
    if (plan.status !== 'implementing') { vscode.window.showErrorMessage(`Plan must be "implementing" to complete steps. Current status: ${plan.status}`); return; }

    const pendingSteps = plan.steps?.filter(s => !s.done) ?? [];
    if (pendingSteps.length === 0) { vscode.window.showInformationMessage('All steps are already done.'); return; }

    const items = pendingSteps.map(s => ({
        label: `Step ${s.order}: ${s.description}`,
        detail: s.files_touched.length ? `Files: ${s.files_touched.join(', ')}` : undefined,
        stepOrder: s.order,
    }));

    const selected = await vscode.window.showQuickPick(items, { canPickMany: true, placeHolder: 'Select step(s) to mark done', title: `Complete Steps — ${plan.title}` });
    if (!selected || selected.length === 0) return;

    try {
        const mcp = getMCP(root);
        for (const item of selected) {
            await mcp.callTool('loom_complete_step', { planId: plan.id, stepNumber: item.stepOrder });
        }
        const count = selected.length;
        vscode.window.showInformationMessage(`🧵 ${count} step${count > 1 ? 's' : ''} completed: ${plan.id}`);
        treeProvider.refresh();
    } catch (e: any) {
        vscode.window.showErrorMessage(`Failed to complete step: ${e.message}`);
        treeProvider.refresh();
    }
}
