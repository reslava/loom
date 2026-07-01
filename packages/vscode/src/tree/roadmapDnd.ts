import * as vscode from 'vscode';
import { LoomTreeProvider, TreeNode } from './treeProvider';
import { ViewStateManager } from '../view/viewStateManager';
import { getMCP } from '../mcp-client';
import { RoadmapNode } from '@reslava-loom/core/dist/derived';

const ROADMAP_MIME = 'application/vnd.loom.roadmap-thread';
const TREE_MIME = 'application/vnd.loom.tree-node';

type TreeDragPayload =
    | { kind: 'thread'; weaveId: string; threadId: string }
    | { kind: 'doc'; id: string };

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
        let payload: TreeDragPayload | undefined;
        if (ctx.startsWith('thread') && node.weaveId && node.threadId) {
            payload = { kind: 'thread', weaveId: node.weaveId, threadId: node.threadId };
        } else if (node.doc?.id) {
            payload = { kind: 'doc', id: node.doc.id };
        }
        if (payload) dataTransfer.set(TREE_MIME, new vscode.DataTransferItem(payload));
    }

    async handleDrop(target: TreeNode | undefined, dataTransfer: vscode.DataTransfer): Promise<void> {
        const treeItem = dataTransfer.get(TREE_MIME);
        if (treeItem) { await this.handleTreeDrop(target, treeItem.value as TreeDragPayload); return; }

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
     * Normal-tree moves: a thread dropped onto a weave → loom_move_thread; a
     * loose-fiber doc dropped onto a thread → loom_move_doc. The move tools own
     * the invariants (loose-fiber guard, singleton slots, ULID preservation) and
     * surface a clear error we relay when a drop isn't allowed.
     */
    private async handleTreeDrop(target: TreeNode | undefined, payload: TreeDragPayload): Promise<void> {
        const root = this.treeProvider.getLoomRoot();
        if (!root || !target) return;
        const ctx = (target.contextValue as string | undefined) ?? '';

        try {
            if (payload.kind === 'thread') {
                // Drop onto a weave → move the thread there.
                if (ctx !== 'weave' || !target.weaveId) {
                    vscode.window.showWarningMessage('Drop a thread onto a weave to move it.');
                    return;
                }
                if (target.weaveId === payload.weaveId) return;
                const res = await getMCP(root).callTool('loom_move_thread', {
                    fromWeaveId: payload.weaveId, threadId: payload.threadId, toWeaveId: target.weaveId,
                }) as any;
                vscode.window.showInformationMessage(`🧵 Moved thread → ${res.to}`);
            } else {
                // Drop a loose fiber onto a thread → move the doc there.
                if (!ctx.startsWith('thread') || !target.weaveId || !target.threadId) {
                    vscode.window.showWarningMessage('Drop a loose fiber (idea/design/chat with no parent or children) onto a thread to move it.');
                    return;
                }
                const res = await getMCP(root).callTool('loom_move_doc', {
                    id: payload.id, toWeaveId: target.weaveId, toThreadId: target.threadId,
                }) as any;
                vscode.window.showInformationMessage(`📄 Moved → ${res.to}`);
            }
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
