import * as vscode from 'vscode';
import { LoomTreeProvider, TreeNode } from './treeProvider';
import { ViewStateManager } from '../view/viewStateManager';
import { getMCP } from '../mcp-client';
import { RoadmapNode } from '@reslava-loom/core/dist/derived';

const ROADMAP_MIME = 'application/vnd.loom.roadmap-thread';
const TREE_MIME = 'application/vnd.loom.tree-node';

// A thread is the atomic, indivisible unit — only whole threads move between weaves.
// (Docs are never moved across threads: a thread is a chain, not a bag of docs.)
type TreeDragPayload = { kind: 'thread'; weaveId: string; threadId: string; threadUlid?: string };

/** Spacing between renumbered priorities — leaves room and keeps writes small. */
const PRIORITY_SPACING = 10;

/**
 * Drag-to-reorder in the Roadmap view. The Roadmap band is one list (present +
 * future in a single dependency+priority order); dragging a thread onto another
 * rewrites soft `priority` (via loom_set_priority) so the dropped thread takes
 * the target's slot — reordering spans the whole list regardless of status.
 *
 * The hard dependency graph is inviolable: a drop that would place a thread
 * before one it depends on (or before a dependent of it) is refused with a
 * warning — an instant client-side pre-check. The read-model's topological sort
 * is the ultimate backstop: `priority` only orders the slack the dependencies
 * leave free and can never override a `depends_on` edge.
 */
export class RoadmapDragAndDropController implements vscode.TreeDragAndDropController<TreeNode> {
    readonly dropMimeTypes = [ROADMAP_MIME, TREE_MIME];
    readonly dragMimeTypes = [ROADMAP_MIME, TREE_MIME];

    constructor(
        private treeProvider: LoomTreeProvider,
        private viewStateManager: ViewStateManager,
    ) {}

    handleDrag(source: readonly TreeNode[], dataTransfer: vscode.DataTransfer): void {
        const node = source[0];
        if (!node) return;

        // Roadmap view: drag a thread to reorder by priority (existing behaviour).
        if (this.viewStateManager.getState().roadmapEnabled) {
            if (!node.roadmap?.ulid) return;
            dataTransfer.set(ROADMAP_MIME, new vscode.DataTransferItem({ ulid: node.roadmap.ulid }));
            return;
        }

        // Normal tree: drag a thread (→ another weave) or a loose-fiber doc (→ a thread).
        const ctx = (node.contextValue as string | undefined) ?? '';
        if (ctx.startsWith('thread') && node.weaveId && node.threadId) {
            const payload: TreeDragPayload = { kind: 'thread', weaveId: node.weaveId, threadId: node.threadId, threadUlid: node.threadUlid };
            dataTransfer.set(TREE_MIME, new vscode.DataTransferItem(payload));
        }
    }

    async handleDrop(target: TreeNode | undefined, dataTransfer: vscode.DataTransfer): Promise<void> {
        // Route by the same `roadmapEnabled` flag handleDrag uses — the one that also
        // decides the on-screen layout. Do NOT infer the mode from which MIME is present:
        // TREE_MIME is a declared dragMimeType, so `dataTransfer.get(TREE_MIME)` can be
        // truthy even in roadmap mode and let the thread-move branch shadow the priority
        // reorder (the regression from adding tree-move DnD). Symmetric with handleDrag.
        if (!this.viewStateManager.getState().roadmapEnabled) {
            const treeItem = dataTransfer.get(TREE_MIME);
            if (treeItem) await this.handleTreeDrop(target, treeItem.value as TreeDragPayload);
            return;
        }

        const item = dataTransfer.get(ROADMAP_MIME);
        if (!item) return;
        const dragged = item.value as { ulid: string };

        const roadmap = this.treeProvider.getRoadmap();
        const root = this.treeProvider.getLoomRoot();
        if (!roadmap || !root) return;

        const list: RoadmapNode[] = roadmap.roadmap;
        const source = list.find(n => n.ulid === dragged.ulid);
        if (!source) return;

        // Resolve the drop position. Onto another roadmap thread → before it;
        // onto the Roadmap band header → append to the end.
        let targetUlid: string | undefined;
        if (target?.roadmap?.ulid) {
            targetUlid = target.roadmap.ulid;
        } else if (target?.contextValue === 'roadmap-band-roadmap') {
            targetUlid = undefined;
        } else {
            return;
        }
        if (targetUlid === source.ulid) return;

        // New order: source removed, then re-inserted before the target.
        const without = list.filter(n => n.ulid !== source.ulid);
        const at = targetUlid ? without.findIndex(n => n.ulid === targetUlid) : without.length;
        const reordered = [...without];
        reordered.splice(at < 0 ? without.length : at, 0, source);

        // Hard-edge pre-check: in the new order every in-band dependency of a
        // node must still precede it (equivalently, no node before its dep).
        const pos = new Map<string, number>();
        reordered.forEach((n, i) => { if (n.ulid) pos.set(n.ulid, i); });
        for (const n of reordered) {
            const ni = pos.get(n.ulid!)!;
            for (const dep of n.dependsOn) {
                const di = pos.get(dep);
                if (di !== undefined && di > ni) {
                    vscode.window.showWarningMessage(
                        `Can't place ${n.weaveId}/${n.threadId} before ${this.labelFor(reordered, dep)} — it depends on it.`,
                    );
                    return;
                }
            }
        }

        // Renumber the band with spaced priorities; write only what changed.
        let wrote = 0;
        try {
            for (let i = 0; i < reordered.length; i++) {
                const n = reordered[i];
                const newPriority = (i + 1) * PRIORITY_SPACING;
                if (!n.ulid || n.priority === newPriority) continue;
                await getMCP(root).callTool('loom_set_priority', { threadUlid: n.ulid, priority: newPriority });
                wrote++;
            }
        } catch (e: any) {
            vscode.window.showErrorMessage(`Reorder failed: ${e.message}`);
            this.treeProvider.refresh();
            return;
        }
        if (wrote > 0) this.treeProvider.refresh();
    }

    /**
     * Normal-tree move: a thread dropped onto a weave → loom_move_thread (the whole
     * chain travels). A thread is the atomic unit, so this is the only cross-container
     * move — docs are never moved between threads.
     */
    private async handleTreeDrop(target: TreeNode | undefined, payload: TreeDragPayload): Promise<void> {
        const root = this.treeProvider.getLoomRoot();
        if (!root || !target) return;
        const ctx = (target.contextValue as string | undefined) ?? '';

        if (ctx !== 'weave' || !target.weaveId) {
            vscode.window.showWarningMessage('Drop a thread onto a weave to move it.');
            return;
        }
        if (target.weaveId === payload.weaveId) return;
        if (!payload.threadUlid) {
            vscode.window.showWarningMessage(`Thread '${payload.weaveId}/${payload.threadId}' has no thread.md manifest — cannot move by identity.`);
            return;
        }
        try {
            const res = await getMCP(root).callTool('loom_move_thread', {
                from_weave_slug: payload.weaveId, thread_ulid: payload.threadUlid, to_weave_slug: target.weaveId,
            }) as any;
            vscode.window.showInformationMessage(`🧵 Moved thread → ${res.to}`);
            this.treeProvider.refresh();
        } catch (e: any) {
            vscode.window.showWarningMessage(`Move refused: ${e.message}`);
        }
    }

    private labelFor(nodes: RoadmapNode[], ulid: string): string {
        const n = nodes.find(x => x.ulid === ulid);
        return n ? `${n.weaveId}/${n.threadId}` : ulid;
    }
}
