import * as vscode from 'vscode';
import { getMCP } from '../mcp-client';
import { LoomTreeProvider, TreeNode } from '../tree/treeProvider';
import { isMcpTimeout, handleMcpError } from '../mcpErrorUtils';
import { RoadmapNode } from '@reslava-loom/core/dist/derived';

interface DepPickItem extends vscode.QuickPickItem {
    ulid: string;
}

/**
 * Visually wire a thread's hard `depends_on` edges — the NO-AI write half of the
 * roadmap dependency graph (the read half, ordering, is already rendered).
 *
 * Completes tri-surface parity: CLI `set-thread-deps` ⇄ MCP `loom_set_thread_deps`
 * ⇄ this menu command. Right-click a thread → *Set Dependencies…* → a multi-select
 * quick-pick of the other roadmap threads, pre-checked with the thread's current
 * deps (so opening the picker IS how you see current wiring). Confirming writes the
 * new edge set via `loom_set_thread_deps`; a cycle / unknown-target / self rejection
 * from the write path surfaces as a warning toast, leaving the graph untouched.
 */
export async function setThreadDepsCommand(treeProvider: LoomTreeProvider, node?: TreeNode): Promise<void> {
    const root = vscode.workspace.workspaceFolders?.[0]?.uri.fsPath;
    if (!root) { vscode.window.showErrorMessage('No workspace open.'); return; }

    // A thread carries its th_ ULID either as a roadmap node (roadmap view) or on
    // the tree node itself (normal view). Deps need a thread.md manifest to live on.
    const threadUlid = node?.roadmap?.ulid ?? node?.threadUlid;
    if (!threadUlid) {
        vscode.window.showWarningMessage('Select a thread with a thread.md manifest to set its dependencies.');
        return;
    }

    // Source candidates + current deps from the roadmap read-model (the dependency
    // graph surface Rafa named). Read fresh so the pre-check reflects the latest edges.
    let roadmap: { roadmap: RoadmapNode[] };
    try {
        roadmap = JSON.parse(await getMCP(root).readResource('loom://roadmap')) as { roadmap: RoadmapNode[] };
    } catch (e: any) {
        handleMcpError(e, treeProvider);
        return;
    }

    const target = roadmap.roadmap.find(n => n.ulid === threadUlid);
    if (!target) {
        vscode.window.showWarningMessage('This thread is not in the roadmap band — only present/future threads can be wired here.');
        return;
    }
    const current = new Set(target.dependsOn);

    // Candidate deps = every other roadmap thread carrying a ULID. Pre-check the
    // current edges so the picker doubles as the "see the wiring" surface.
    const items: DepPickItem[] = roadmap.roadmap
        .filter(n => n.ulid && n.ulid !== threadUlid)
        .map(n => ({
            ulid: n.ulid!,
            label: `${n.weaveSlug}/${n.threadSlug}`,
            description: n.title,
            picked: current.has(n.ulid!),
        }));

    if (items.length === 0) {
        vscode.window.showInformationMessage('No other roadmap threads to depend on.');
        return;
    }

    const picked = await vscode.window.showQuickPick(items, {
        canPickMany: true,
        title: `Dependencies for ${target.weaveSlug}/${target.threadSlug}`,
        placeHolder: 'Select the threads this one depends on (pre-checked = current)',
    });
    if (picked === undefined) return; // cancelled — no change

    const dependsOn = picked.map(i => i.ulid);
    try {
        await getMCP(root).callTool('loom_set_thread_deps', { thread_ulid: threadUlid, depends_on: dependsOn });
        vscode.window.showInformationMessage(
            dependsOn.length > 0
                ? `🧵 Dependencies set: ${target.weaveSlug}/${target.threadSlug} → ${dependsOn.length}`
                : `🧵 Dependencies cleared: ${target.weaveSlug}/${target.threadSlug}`,
        );
        treeProvider.refresh();
    } catch (e: any) {
        // A cycle / unknown-target / self-dependency rejection is an expected refusal,
        // not a crash — surface it as a warning and leave the graph as-is (mirrors the
        // roadmap DnD refusal pattern). Genuine transport timeouts still reconnect.
        if (isMcpTimeout(e)) { handleMcpError(e, treeProvider); return; }
        vscode.window.showWarningMessage(`Dependencies refused: ${e.message}`);
    }
}
