import * as vscode from 'vscode';
import { LoomTreeProvider, TreeNode } from './treeProvider';
import { ViewStateManager } from '../view/viewStateManager';
import { getMCP } from '../mcp-client';
import { RoadmapNode } from '@reslava-loom/core/dist/derived';

const ROADMAP_MIME = 'application/vnd.loom.roadmap-thread';

/** Spacing between renumbered priorities — leaves room and keeps writes small. */
const PRIORITY_SPACING = 10;

/**
 * Drag-to-reorder in the Roadmap view (Plan-2 Step 4). Dragging a Future or
 * Present thread onto another in the SAME band rewrites soft `priority` (via
 * loom_set_priority) so the dropped thread takes the target's slot.
 *
 * The hard dependency graph is inviolable: a drop that would place a thread
 * before one it depends on (or before a dependent of it) is refused with a
 * warning — an instant client-side pre-check. The read-model's topological sort
 * is the ultimate backstop: `priority` only orders the slack the dependencies
 * leave free and can never override a `depends_on` edge.
 */
export class RoadmapDragAndDropController implements vscode.TreeDragAndDropController<TreeNode> {
    readonly dropMimeTypes = [ROADMAP_MIME];
    readonly dragMimeTypes = [ROADMAP_MIME];

    constructor(
        private treeProvider: LoomTreeProvider,
        private viewStateManager: ViewStateManager,
    ) {}

    handleDrag(source: readonly TreeNode[], dataTransfer: vscode.DataTransfer): void {
        if (!this.viewStateManager.getState().roadmapEnabled) return;
        const node = source[0];
        if (!node?.roadmap?.ulid || !node.roadmapBand) return;
        dataTransfer.set(
            ROADMAP_MIME,
            new vscode.DataTransferItem({ ulid: node.roadmap.ulid, band: node.roadmapBand }),
        );
    }

    async handleDrop(target: TreeNode | undefined, dataTransfer: vscode.DataTransfer): Promise<void> {
        const item = dataTransfer.get(ROADMAP_MIME);
        if (!item) return;
        const dragged = item.value as { ulid: string; band: 'future' | 'present' };

        const roadmap = this.treeProvider.getRoadmap();
        const root = this.treeProvider.getLoomRoot();
        if (!roadmap || !root) return;

        const band: RoadmapNode[] = dragged.band === 'future' ? roadmap.future : roadmap.present;
        const source = band.find(n => n.ulid === dragged.ulid);
        if (!source) return;

        // Resolve the drop position. Onto a node in the same band → before it;
        // onto that band's header → append to the end.
        let targetUlid: string | undefined;
        if (target?.roadmap?.ulid && target.roadmapBand === dragged.band) {
            targetUlid = target.roadmap.ulid;
        } else if (target?.contextValue === `roadmap-band-${dragged.band}`) {
            targetUlid = undefined;
        } else if (target?.roadmapBand && target.roadmapBand !== dragged.band) {
            vscode.window.showWarningMessage('Roadmap reorder works within a single band (Future or Present).');
            return;
        } else {
            return;
        }
        if (targetUlid === source.ulid) return;

        // New band order: source removed, then re-inserted before the target.
        const without = band.filter(n => n.ulid !== source.ulid);
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

    private labelFor(nodes: RoadmapNode[], ulid: string): string {
        const n = nodes.find(x => x.ulid === ulid);
        return n ? `${n.weaveId}/${n.threadId}` : ulid;
    }
}
