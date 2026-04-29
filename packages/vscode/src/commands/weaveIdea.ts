import * as vscode from 'vscode';
import { getMCP } from '../mcp-client';
import { toKebabCaseId } from '@reslava-loom/core/dist';
import { LoomTreeProvider, TreeNode } from '../tree/treeProvider';

export async function weaveIdeaCommand(treeProvider: LoomTreeProvider, node?: TreeNode): Promise<void> {
    const root = vscode.workspace.workspaceFolders?.[0]?.uri.fsPath;
    if (!root) { vscode.window.showErrorMessage('No workspace open.'); return; }

    const title = await vscode.window.showInputBox({ prompt: 'Idea title', placeHolder: 'e.g., Add Dark Mode' });
    if (!title) return;

    let weaveId = node?.weaveId;
    if (!weaveId) {
        weaveId = await vscode.window.showInputBox({ prompt: 'Weave ID', placeHolder: 'e.g., payment-system' });
        if (!weaveId) return;
    }

    const threadId: string = node?.threadId ?? toKebabCaseId(title);

    try {
        const result = await getMCP(root).callTool('loom_create_idea', { weaveId, threadId, title }) as any;
        vscode.window.showInformationMessage(`🧵 Idea woven: ${result.id}`);
        treeProvider.refresh();
    } catch (e: any) {
        vscode.window.showErrorMessage(`Failed to weave idea: ${e.message}`);
    }
}
