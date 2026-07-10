import * as vscode from 'vscode';
import { getMCP } from '../mcp-client';
import { toKebabCaseId, stripTrailingTypeWord } from '@reslava-loom/core/dist';
import { LoomTreeProvider, TreeNode } from '../tree/treeProvider';
import { revealDocAfterCreate } from './revealDoc';
import { ensureThreadUlid } from './ensureThreadUlid';

export async function weaveIdeaCommand(treeProvider: LoomTreeProvider, treeView: vscode.TreeView<TreeNode>, node?: TreeNode): Promise<void> {
    const root = vscode.workspace.workspaceFolders?.[0]?.uri.fsPath;
    if (!root) { vscode.window.showErrorMessage('No workspace open.'); return; }

    const titleInput = await vscode.window.showInputBox({ prompt: 'Idea title (leave blank to use default)', placeHolder: 'e.g., Add Dark Mode' });
    if (titleInput === undefined) return;

    let weaveSlug = node?.weaveSlug;
    if (!weaveSlug) {
        weaveSlug = await vscode.window.showInputBox({ prompt: 'Weave ID', placeHolder: 'e.g., payment-system' });
        if (!weaveSlug) return;
    }

    // Strip a trailing "idea" word so a title like "Dark Mode Idea" yields the thread
    // dark-mode (→ dark-mode-idea.md), not dark-mode-idea (→ dark-mode-idea-idea.md).
    const threadSlug: string = node?.threadSlug ?? (titleInput ? stripTrailingTypeWord(toKebabCaseId(titleInput), 'idea') : 'new-idea');
    const title = titleInput || `${threadSlug} idea`;

    try {
        // Doc-create references a thread by ULID; mint the thread manifest first when new.
        const threadUlid = await ensureThreadUlid(root, weaveSlug, node, threadSlug);
        const result = await getMCP(root).callTool('loom_create_idea', { weave_slug: weaveSlug, thread_ulid: threadUlid, title }) as any;
        vscode.window.showInformationMessage(`🧵 Idea woven: ${result.id}`);
        revealDocAfterCreate(treeProvider, treeView, result?.filePath);
    } catch (e: any) {
        vscode.window.showErrorMessage(`Failed to weave idea: ${e.message}`);
    }
}
