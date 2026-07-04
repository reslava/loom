import * as vscode from 'vscode';
import { getMCP } from '../mcp-client';
import { LoomTreeProvider, TreeNode } from '../tree/treeProvider';
import { handleMcpError } from '../mcpErrorUtils';
import { isClaudeInstalled, launchClaude } from './claudeTerminal';
import { revealDocAfterCreate } from './revealDoc';

const REQ_BODY_SHAPE =
    'the req body as three sections (### ✅ Included / ### ❌ Excluded / ### ⛓ Constraints), each bullet prefixed with an inline-code stable id (`IN1`, `EX1`, `C1`). Extract ONLY requirements the user explicitly stated; never invent scope; do not treat open questions as requirements. Each ✅ Included item must be orthogonal and individually verifiable: do not restate one requirement from two angles, and do not add the overall outcome/thesis as an Included item (that is the goal, not a deliverable). Prefer fewer, sharper items over many overlapping ones.';

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
    const threadUlid = node?.threadUlid;
    if (!weaveId || !threadId) { vscode.window.showErrorMessage('Right-click a thread to generate its requirements.'); return; }

    if (await isClaudeInstalled()) {
        if (!threadUlid) { vscode.window.showErrorMessage(`Thread '${threadId}' has no thread.md manifest — cannot create its req by identity.`); return; }
        await launchClaude(root, 'Loom: Generate Requirements',
            `Loom generate requirements task. weave_slug="${weaveId}", thread_ulid="${threadUlid}". Use the loom MCP server: read the thread's chat context (resource loom://context/thread/${weaveId}/${threadId}?mode=chat), then call MCP tool loom_create_req ONCE with weave_slug="${weaveId}" thread_ulid="${threadUlid}" and content — ${REQ_BODY_SHAPE} Do NOT call loom_update_doc afterwards — pass the body in the content argument. Do not use loom_generate_req — sampling is unavailable in Claude Code CLI.`,
        );
    } else {
        try {
            let result: any;
            await vscode.window.withProgress(
                { location: vscode.ProgressLocation.Notification, title: 'Loom: Generating requirements…', cancellable: false },
                async () => { result = await getMCP(root).callTool('loom_generate_req', { weave_slug: weaveId, thread_ulid: threadUlid }); },
            );
            treeProvider.refresh();
            revealDocAfterCreate(treeProvider, treeView, result?.filePath);
            vscode.window.showInformationMessage('Requirements generated — review, then Finalize to lock.');
        } catch (e: any) { handleMcpError(e, treeProvider); }
    }
}

/**
 * Verify a thread's plan against its locked req: structural coverage + (in the
 * extension) an AI semantic pass. Findings go to the "Loom Req Verify" output.
 */
export async function verifyReqCommand(treeProvider: LoomTreeProvider, node?: TreeNode): Promise<void> {
    const root = vscode.workspace.workspaceFolders?.[0]?.uri.fsPath;
    if (!root) { vscode.window.showErrorMessage('No workspace open.'); return; }
    const weaveId = node?.weaveId;
    const threadId = node?.threadId;
    const threadUlid = node?.threadUlid;
    if (!weaveId || !threadId) { vscode.window.showErrorMessage('Right-click a req (or its thread) to verify the plan against it.'); return; }
    if (!threadUlid) { vscode.window.showErrorMessage(`Thread '${threadId}' has no thread.md manifest — cannot verify its req by identity.`); return; }

    try {
        let result: any;
        await vscode.window.withProgress(
            { location: vscode.ProgressLocation.Notification, title: 'Loom: Verifying plan against requirements…', cancellable: false },
            async () => { result = await getMCP(root).callTool('loom_verify_req', { weave_slug: weaveId, thread_ulid: threadUlid }); },
        );

        if (result?.ok === false) { vscode.window.showWarningMessage(`Requirements check: ${result.reason}.`); return; }

        const s = result?.structural ?? {};
        const sem = result?.semantic ?? {};
        const structuralGaps = (s.uncovered?.length ?? 0) + (s.excludedViolations?.length ?? 0) + (s.unknownCitations?.length ?? 0);
        const semanticFlags = (sem.violations?.length ?? 0) + (sem.uncited?.length ?? 0);

        if (structuralGaps === 0 && semanticFlags === 0 && !result?.semanticError) {
            vscode.window.showInformationMessage('✅ Plan honours the requirements — no coverage gaps or semantic flags.');
            return;
        }

        const out = vscode.window.createOutputChannel('Loom Req Verify');
        out.clear();
        out.appendLine(JSON.stringify(result, null, 2));
        out.show(true);
        const parts: string[] = [];
        if (structuralGaps) parts.push(`${structuralGaps} structural gap(s)`);
        if (semanticFlags) parts.push(`${semanticFlags} semantic flag(s)`);
        if (result?.semanticError) parts.push('semantic pass unavailable here (run in the extension)');
        vscode.window.showWarningMessage(`Requirements check: ${parts.join(', ')} — see the "Loom Req Verify" output.`);
    } catch (e: any) { handleMcpError(e, treeProvider); }
}

/** Finalize (lock) a thread's draft req. */
export async function finalizeReqCommand(treeProvider: LoomTreeProvider, node?: TreeNode): Promise<void> {
    const root = vscode.workspace.workspaceFolders?.[0]?.uri.fsPath;
    if (!root) { vscode.window.showErrorMessage('No workspace open.'); return; }
    const weaveId = node?.weaveId;
    const threadId = node?.threadId;
    const threadUlid = node?.threadUlid;
    if (!weaveId || !threadId) { vscode.window.showErrorMessage('Right-click a req doc to finalize it.'); return; }
    if (!threadUlid) { vscode.window.showErrorMessage(`Thread '${threadId}' has no thread.md manifest — cannot finalize its req by identity.`); return; }

    try {
        await getMCP(root).callTool('loom_finalize_req', { weave_slug: weaveId, thread_ulid: threadUlid });
        vscode.window.showInformationMessage('🔒 Requirements locked.');
        treeProvider.refresh();
    } catch (e: any) { handleMcpError(e, treeProvider); }
}

/**
 * Amend a req under append-only rules. Dual path: a Claude CLI session reconciles
 * the chat into the spec and calls loom_amend_req with new content (never deleting
 * or renumbering a handle); otherwise we re-open to draft (bumping the version)
 * and open the file for manual curation.
 */
export async function amendReqCommand(treeProvider: LoomTreeProvider, node?: TreeNode): Promise<void> {
    const root = vscode.workspace.workspaceFolders?.[0]?.uri.fsPath;
    if (!root) { vscode.window.showErrorMessage('No workspace open.'); return; }
    const weaveId = node?.weaveId;
    const threadId = node?.threadId;
    const threadUlid = node?.threadUlid;
    if (!weaveId || !threadId) { vscode.window.showErrorMessage('Right-click a req doc to amend it.'); return; }
    if (!threadUlid) { vscode.window.showErrorMessage(`Thread '${threadId}' has no thread.md manifest — cannot amend its req by identity.`); return; }

    if (await isClaudeInstalled()) {
        await launchClaude(root, 'Loom: Amend Requirements',
            `Loom amend requirements task. weave_slug="${weaveId}", thread_ulid="${threadUlid}". First READ the current req (its existing handles are AUTHORITATIVE — keep them verbatim). Re-read the thread's chat context (loom://context/thread/${weaveId}/${threadId}?mode=chat), then call MCP tool loom_amend_req ONCE with weave_slug="${weaveId}" thread_ulid="${threadUlid}" and content — ${REQ_BODY_SHAPE} APPEND-ONLY RULES (the tool refuses any other change): preserve every existing handle id and its number EXACTLY; add new scope only as fresh handles continuing the numbering (e.g. if IN1–IN6 exist, new items are IN7, IN8, …); NEVER renumber, reuse, or delete a handle; to retire an obsolete requirement, keep its line and mark it by inserting \`~dropped\` immediately after the handle (e.g. \`- \\\`IN3\\\` ~dropped superseded by IN7\`). This re-opens the req to draft and bumps its version.`,
        );
    } else {
        try {
            const result: any = await getMCP(root).callTool('loom_amend_req', { weave_slug: weaveId, thread_ulid: threadUlid });
            treeProvider.refresh();
            if (result?.filePath) {
                const doc = await vscode.workspace.openTextDocument(result.filePath);
                await vscode.window.showTextDocument(doc, { preview: false });
            }
            vscode.window.showInformationMessage('Requirements re-opened for editing (draft). Finalize to re-lock.');
        } catch (e: any) { handleMcpError(e, treeProvider); }
    }
}
