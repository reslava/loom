import * as vscode from 'vscode';
import { getMCP } from '../mcp-client';
import { LoomTreeProvider, TreeNode } from '../tree/treeProvider';
import { handleMcpError } from '../mcpErrorUtils';
import { revealDocAfterCreate } from './revealDoc';
import { ensureThreadUlid } from './ensureThreadUlid';

export async function createDesignCommand(treeProvider: LoomTreeProvider, treeView: vscode.TreeView<TreeNode>, node?: TreeNode): Promise<void> {
    const root = vscode.workspace.workspaceFolders?.[0]?.uri.fsPath;
    if (!root) { vscode.window.showErrorMessage('No workspace open.'); return; }

    const weaveSlug = node?.weaveSlug ?? await vscode.window.showInputBox({ prompt: 'Weave ID', placeHolder: 'e.g., payment-system' });
    if (!weaveSlug) return;

    let threadSlug = node?.threadSlug;
    if (!threadSlug) {
        threadSlug = await vscode.window.showInputBox({ prompt: 'Thread slug', placeHolder: 'e.g., state-management' }) || undefined;
    }
    if (!threadSlug) { vscode.window.showErrorMessage('A thread is required — a design lives in a thread.'); return; }

    const title = await vscode.window.showInputBox({ prompt: 'Design title (optional)', placeHolder: 'Leave blank to use idea title or thread slug' }) || undefined;

    try {
        const threadUlid = await ensureThreadUlid(root, weaveSlug, node, threadSlug);
        const result = await getMCP(root).callTool('loom_create_design', { weave_slug: weaveSlug, thread_ulid: threadUlid, title }) as any;
        vscode.window.showInformationMessage(`🧵 Design woven: ${result.id}`);
        revealDocAfterCreate(treeProvider, treeView, result?.filePath);
    } catch (e: any) {
        handleMcpError(e, treeProvider);
    }
}
