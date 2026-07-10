import * as vscode from 'vscode';
import { getMCP } from '../mcp-client';
import { LoomTreeProvider } from '../tree/treeProvider';

/**
 * Rename dispatch by node kind:
 *   - weave node  → rename the weave FOLDER (loom_rename_weave)
 *   - thread node → rename the thread FOLDER slug (loom_rename_thread)
 *   - doc node    → rename the TITLE only (loom_rename); id + filename stable
 *
 * This replaces the old wiring that called the doc-title rename for every node
 * kind — which prompted "Document ID to rename" for a weave/thread folder.
 */
export async function renameCommand(treeProvider: LoomTreeProvider, node?: any): Promise<void> {
    const root = vscode.workspace.workspaceFolders?.[0]?.uri.fsPath;
    if (!root) { vscode.window.showErrorMessage('No workspace open.'); return; }
    const mcp = getMCP(root);
    const ctx = (node?.contextValue as string | undefined) ?? '';

    try {
        if (ctx === 'weave' || ctx === 'weave-archived') {
            const weaveSlug = node?.weaveSlug as string;
            const newWeaveId = await vscode.window.showInputBox({ prompt: `Rename weave folder '${weaveSlug}' to`, value: weaveSlug });
            if (!newWeaveId || newWeaveId === weaveSlug) return;
            const res = await mcp.callTool('loom_rename_weave', { weave_slug: weaveSlug, new_weave_slug: newWeaveId }) as any;
            vscode.window.showInformationMessage(`📁 Weave renamed → ${res.to}`);
        } else if (ctx.startsWith('thread')) {
            const weaveSlug = node?.weaveSlug as string;
            const threadSlug = node?.threadSlug as string;
            const threadUlid = node?.threadUlid as string | undefined;
            if (!threadUlid) { vscode.window.showErrorMessage(`Thread '${threadSlug}' has no thread.md manifest — cannot rename by identity.`); return; }
            const newThreadId = await vscode.window.showInputBox({ prompt: `Rename thread folder '${threadSlug}' to`, value: threadSlug });
            if (!newThreadId || newThreadId === threadSlug) return;
            const res = await mcp.callTool('loom_rename_thread', { weave_slug: weaveSlug, thread_ulid: threadUlid, new_thread_slug: newThreadId }) as any;
            vscode.window.showInformationMessage(`🧵 Thread renamed → ${res.to}`);
        } else if (node?.doc?.id) {
            const newTitle = await vscode.window.showInputBox({ prompt: 'New title', value: node.doc.title });
            if (!newTitle) return;
            const res = await mcp.callTool('loom_retitle', { doc_ulid: node.doc.id, newTitle }) as any;
            vscode.window.showInformationMessage(`✏️  Renamed to "${res.title}" (id unchanged: ${res.id})`);
        } else {
            // Section/summary/other nodes are not renamable — no-op (F2 lands here otherwise).
            vscode.window.showInformationMessage('Select a weave, thread, or document to rename.');
            return;
        }
        treeProvider.refresh();
    } catch (e: any) {
        vscode.window.showErrorMessage(`Failed to rename: ${e.message}`);
    }
}

/**
 * Rename a reference doc's FILENAME slug (loom_rename_doc_file). References are the
 * one doc type whose filename is a human slug; all other doc filenames are
 * machine-owned (use the title rename above).
 */
export async function renameFileCommand(treeProvider: LoomTreeProvider, node?: any): Promise<void> {
    const root = vscode.workspace.workspaceFolders?.[0]?.uri.fsPath;
    if (!root) { vscode.window.showErrorMessage('No workspace open.'); return; }
    const id = node?.doc?.id;
    if (!id) { vscode.window.showErrorMessage('Select a reference document to rename its file.'); return; }

    const newSlug = await vscode.window.showInputBox({ prompt: 'New filename slug (no .md)', value: node?.doc?.slug });
    if (!newSlug) return;
    try {
        const res = await getMCP(root).callTool('loom_rename_reference_file', { doc_ulid: id, new_slug: newSlug }) as any;
        vscode.window.showInformationMessage(`📄 Reference file renamed → ${res.to}`);
        treeProvider.refresh();
    } catch (e: any) {
        vscode.window.showErrorMessage(`Failed to rename file: ${e.message}`);
    }
}
