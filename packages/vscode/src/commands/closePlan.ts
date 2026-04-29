import * as vscode from 'vscode';
import { getMCP } from '../mcp-client';
import { LoomTreeProvider, TreeNode } from '../tree/treeProvider';
import { PlanDoc } from '@reslava-loom/core/dist/entities/plan';

export async function closePlanCommand(treeProvider: LoomTreeProvider, node?: TreeNode): Promise<void> {
    const root = vscode.workspace.workspaceFolders?.[0]?.uri.fsPath;
    if (!root) { vscode.window.showErrorMessage('No workspace open.'); return; }

    const plan = node?.doc as PlanDoc | undefined;
    if (!plan || plan.type !== 'plan') { vscode.window.showErrorMessage('Select a plan node to close it.'); return; }
    if (plan.status !== 'implementing' && plan.status !== 'done') { vscode.window.showErrorMessage(`Plan must be "implementing" or "done" to close. Current status: ${plan.status}`); return; }

    const notes = await vscode.window.showInputBox({ prompt: 'Optional notes for the done doc (leave blank to skip)', placeHolder: 'e.g. Skipped step 3 due to scope change' });
    if (notes === undefined) return;

    try {
        const result = await getMCP(root).callTool('loom_close_plan', { planId: plan.id, notes: notes || undefined }) as any;
        treeProvider.refresh();
        if (result?.donePath) {
            const doc = await vscode.workspace.openTextDocument(result.donePath);
            await vscode.window.showTextDocument(doc);
        }
        vscode.window.showInformationMessage(`Plan closed — done doc saved.`);
    } catch (e: any) {
        vscode.window.showErrorMessage(`Close Plan failed: ${e.message}`);
    }
}
