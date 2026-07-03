import * as vscode from 'vscode';
import { getMCP } from '../mcp-client';
import { LoomTreeProvider, TreeNode } from '../tree/treeProvider';
import { handleMcpError } from '../mcpErrorUtils';
import { revealDocAfterCreate } from './revealDoc';
import { ensureThreadUlid } from './ensureThreadUlid';

export async function weaveDesignCommand(treeProvider: LoomTreeProvider, treeView: vscode.TreeView<TreeNode>, node?: TreeNode): Promise<void> {
    const root = vscode.workspace.workspaceFolders?.[0]?.uri.fsPath;
    if (!root) { vscode.window.showErrorMessage('No workspace open.'); return; }

    const weaveId = node?.weaveId ?? await vscode.window.showInputBox({ prompt: 'Weave ID', placeHolder: 'e.g., payment-system' });
    if (!weaveId) return;

    let threadId = node?.threadId;
    if (!threadId) {
        threadId = await vscode.window.showInputBox({ prompt: 'Thread slug', placeHolder: 'e.g., state-management' }) || undefined;
    }
    if (!threadId) { vscode.window.showErrorMessage('A thread is required — a design lives in a thread.'); return; }

    const title = await vscode.window.showInputBox({ prompt: 'Design title (optional)', placeHolder: 'Leave blank to use idea title or thread slug' }) || undefined;

    try {
        const threadUlid = await ensureThreadUlid(root, weaveId, node, threadId);
        const result = await getMCP(root).callTool('loom_create_design', { weave_slug: weaveId, thread_ulid: threadUlid, title }) as any;
        vscode.window.showInformationMessage(`🧵 Design woven: ${result.id}`);
        revealDocAfterCreate(treeProvider, treeView, result?.filePath);
    } catch (e: any) {
        handleMcpError(e, treeProvider);
    }
}
