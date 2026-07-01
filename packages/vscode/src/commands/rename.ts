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
            const weaveId = node?.weaveId as string;
            const newWeaveId = await vscode.window.showInputBox({ prompt: `Rename weave folder '${weaveId}' to`, value: weaveId });
            if (!newWeaveId || newWeaveId === weaveId) return;
            const res = await mcp.callTool('loom_rename_weave', { weaveId, newWeaveId }) as any;
            vscode.window.showInformationMessage(`📁 Weave renamed → ${res.to}`);
        } else if (ctx.startsWith('thread')) {
            const weaveId = node?.weaveId as string;
            const threadId = node?.threadId as string;
            const newThreadId = await vscode.window.showInputBox({ prompt: `Rename thread folder '${threadId}' to`, value: threadId });
            if (!newThreadId || newThreadId === threadId) return;
            const res = await mcp.callTool('loom_rename_thread', { weaveId, threadId, newThreadId }) as any;
            vscode.window.showInformationMessage(`🧵 Thread renamed → ${res.to}`);
        } else {
            const oldId = node?.doc?.id ?? await vscode.window.showInputBox({ prompt: 'Document ID to rename' });
            if (!oldId) return;
            const newTitle = await vscode.window.showInputBox({ prompt: 'New title', value: node?.doc?.title });
            if (!newTitle) return;
            const res = await mcp.callTool('loom_rename', { oldId, newTitle }) as any;
            vscode.window.showInformationMessage(`✏️  Renamed to "${res.title}" (id unchanged: ${res.id})`);
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
        const res = await getMCP(root).callTool('loom_rename_doc_file', { id, newSlug }) as any;
        vscode.window.showInformationMessage(`📄 Reference file renamed → ${res.to}`);
        treeProvider.refresh();
    } catch (e: any) {
        vscode.window.showErrorMessage(`Failed to rename file: ${e.message}`);
    }
}
