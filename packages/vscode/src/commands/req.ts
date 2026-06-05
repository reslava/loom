import * as vscode from 'vscode';
import { getMCP } from '../mcp-client';
import { LoomTreeProvider, TreeNode } from '../tree/treeProvider';
import { handleMcpError } from '../mcpErrorUtils';
import { isClaudeInstalled, launchClaude } from './claudeTerminal';
import { revealDocAfterCreate } from './revealDoc';

const REQ_BODY_SHAPE =
    'the req body as three sections (### ✅ Included / ### ❌ Excluded / ### ⛓ Constraints), each bullet prefixed with an inline-code stable id (`IN1`, `EX1`, `C1`). Extract ONLY requirements the user explicitly stated; never invent scope; do not treat open questions as requirements.';

/**
 * Generate a thread's req doc from its chat. Dual path (like generate design/plan):
 * a Claude CLI session extracts and calls loom_create_req with content; otherwise
 * MCP sampling (loom_generate_req) runs the extraction in-extension.
 */
export async function generateReqCommand(
    treeProvider: LoomTreeProvider,
    treeView: vscode.TreeView<TreeNode>,
    node?: TreeNode,
): Promise<void> {
    const root = vscode.workspace.workspaceFolders?.[0]?.uri.fsPath;
    if (!root) { vscode.window.showErrorMessage('No workspace open.'); return; }
    const weaveId = node?.weaveId;
    const threadId = node?.threadId;
    if (!weaveId || !threadId) { vscode.window.showErrorMessage('Right-click a thread to generate its requirements.'); return; }

    if (await isClaudeInstalled()) {
        await launchClaude(root, 'Loom: Generate Requirements',
            `Loom generate requirements task. weaveId="${weaveId}", threadId="${threadId}". Use the loom MCP server: read the thread's chat context (resource loom://context/thread/${weaveId}/${threadId}?mode=chat), then call MCP tool loom_create_req ONCE with weaveId="${weaveId}" threadId="${threadId}" and content — ${REQ_BODY_SHAPE} Do NOT call loom_update_doc afterwards — pass the body in the content argument. Do not use loom_generate_req — sampling is unavailable in Claude Code CLI.`,
        );
    } else {
        try {
            let result: any;
            await vscode.window.withProgress(
                { location: vscode.ProgressLocation.Notification, title: 'Loom: Generating requirements…', cancellable: false },
                async () => { result = await getMCP(root).callTool('loom_generate_req', { weaveId, threadId }); },
            );
            treeProvider.refresh();
            revealDocAfterCreate(treeProvider, treeView, result?.filePath);
            vscode.window.showInformationMessage('Requirements generated — review, then Finalize to lock.');
        } catch (e: any) { handleMcpError(e, treeProvider); }
    }
}

/** Finalize (lock) a thread's draft req. */
export async function finalizeReqCommand(treeProvider: LoomTreeProvider, node?: TreeNode): Promise<void> {
    const root = vscode.workspace.workspaceFolders?.[0]?.uri.fsPath;
    if (!root) { vscode.window.showErrorMessage('No workspace open.'); return; }
    const weaveId = node?.weaveId;
    const threadId = node?.threadId;
    if (!weaveId || !threadId) { vscode.window.showErrorMessage('Right-click a req doc to finalize it.'); return; }

    try {
        await getMCP(root).callTool('loom_finalize_req', { weaveId, threadId });
        vscode.window.showInformationMessage('🔒 Requirements locked.');
        treeProvider.refresh();
    } catch (e: any) { handleMcpError(e, treeProvider); }
}

/**
 * Re-open a locked req for curation. Dual path: a Claude CLI session re-extracts
 * from the chat and calls loom_refine_req with new content; otherwise we re-open
 * to draft (bumping the version) and open the file for manual editing.
 */
export async function refineReqCommand(treeProvider: LoomTreeProvider, node?: TreeNode): Promise<void> {
    const root = vscode.workspace.workspaceFolders?.[0]?.uri.fsPath;
    if (!root) { vscode.window.showErrorMessage('No workspace open.'); return; }
    const weaveId = node?.weaveId;
    const threadId = node?.threadId;
    if (!weaveId || !threadId) { vscode.window.showErrorMessage('Right-click a req doc to refine it.'); return; }

    if (await isClaudeInstalled()) {
        await launchClaude(root, 'Loom: Refine Requirements',
            `Loom refine requirements task. weaveId="${weaveId}", threadId="${threadId}". Re-read the thread's chat context (loom://context/thread/${weaveId}/${threadId}?mode=chat), then call MCP tool loom_refine_req ONCE with weaveId="${weaveId}" threadId="${threadId}" and content — ${REQ_BODY_SHAPE} This re-opens the req to draft and bumps its version.`,
        );
    } else {
        try {
            const result: any = await getMCP(root).callTool('loom_refine_req', { weaveId, threadId });
            treeProvider.refresh();
            if (result?.filePath) {
                const doc = await vscode.workspace.openTextDocument(result.filePath);
                await vscode.window.showTextDocument(doc, { preview: false });
            }
            vscode.window.showInformationMessage('Requirements re-opened for editing (draft). Finalize to re-lock.');
        } catch (e: any) { handleMcpError(e, treeProvider); }
    }
}
