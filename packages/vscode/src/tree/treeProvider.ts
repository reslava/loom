import * as vscode from 'vscode';
import { getMCP, disposeMCP } from '../mcp-client';
import { LoomState } from '@reslava-loom/core/dist/entities/state';
import { Weave } from '@reslava-loom/core/dist/entities/weave';
import { Thread } from '@reslava-loom/core/dist/entities/thread';
import { Document } from '@reslava-loom/core/dist/entities/document';
import { PlanDoc } from '@reslava-loom/core/dist/entities/plan';
import { DesignDoc } from '@reslava-loom/core/dist/entities/design';
import { ChatDoc } from '@reslava-loom/core/dist/entities/chat';
import { DoneDoc } from '@reslava-loom/core/dist/entities/done';
import { getWeaveStatus, getThreadStatus } from '@reslava-loom/core/dist/derived';
import { RoadmapView, RoadmapNode, ShippedPlan, RoadmapStatus, DEFAULT_ROADMAP_PRIORITY } from '@reslava-loom/core/dist/derived';
import { isStepBlocked } from '@reslava-loom/core/dist/planUtils';
import { maxVersion, compareVersions } from '@reslava-loom/core/dist/versionUtils';
import { ViewStateManager } from '../view/viewStateManager';
import { GroupingMode, HistoryGrouping, ViewState } from '../view/viewState';
import { Icons, icon, getDocumentIcon, getWeaveIcon, getThreadIcon, getPlanIcon } from '../icons';

export interface TreeNode extends vscode.TreeItem {
    children?: TreeNode[];
    weaveId?: string;
    threadId?: string;
    doc?: Document;
    /** Roadmap thread node — carries the read-model node for drag-reorder. */
    roadmap?: RoadmapNode;
}

export class LoomTreeProvider implements vscode.TreeDataProvider<TreeNode> {
    private _onDidChangeTreeData = new vscode.EventEmitter<TreeNode | undefined | void>();
    readonly onDidChangeTreeData = this._onDidChangeTreeData.event;

    private _onMCPStateChange = new vscode.EventEmitter<void>();
    readonly onMCPStateChange = this._onMCPStateChange.event;

    private state: LoomState | null = null;
    private lastGoodState: LoomState | null = null;
    private workspaceRoot: string | undefined;
    /** Last rendered roadmap — the drag-reorder controller reads its band ordering from here. */
    private lastRoadmap: RoadmapView | null = null;

    private filePathToNode = new Map<string, TreeNode>();
    private nodeToParent = new Map<TreeNode, TreeNode>();
    private weaveIdToNode = new Map<string, TreeNode>();
    private threadKeyToNode = new Map<string, TreeNode>();
    private _afterRefreshCallbacks: Array<() => void> = [];

    constructor(private viewStateManager: ViewStateManager) {}

    waitForRefresh(): Promise<void> {
        return new Promise(resolve => {
            this._afterRefreshCallbacks.push(resolve);
            this._onDidChangeTreeData.fire();
        });
    }

    setWorkspaceRoot(root: string | undefined): void {
        this.workspaceRoot = root;
    }

    getState(): LoomState | null { return this.state; }
    getLoomRoot(): string | undefined { return this.workspaceRoot; }
    getRoadmap(): RoadmapView | null { return this.lastRoadmap; }

    refresh(): void {
        this._onDidChangeTreeData.fire();
    }

    async getTreeItem(element: TreeNode): Promise<vscode.TreeItem> {
        return element;
    }

    getParent(element: TreeNode): TreeNode | undefined {
        return this.nodeToParent.get(element);
    }

    getNodeByFilePath(filePath: string): TreeNode | undefined {
        return this.filePathToNode.get(filePath);
    }

    async getChildren(element?: TreeNode): Promise<TreeNode[]> {
        if (!element) {
            return this.getRootChildren();
        }
        return element.children ?? [];
    }

    private buildNodeMaps(nodes: TreeNode[], parent: TreeNode | undefined): void {
        for (const node of nodes) {
            if (parent) this.nodeToParent.set(node, parent);
            const arg = node.command?.arguments?.[0];
            if (arg instanceof vscode.Uri) {
                this.filePathToNode.set(arg.fsPath, node);
            }
            if (node.weaveId && !node.threadId && node.contextValue === 'weave') {
                this.weaveIdToNode.set(node.weaveId, node);
            }
            if (node.weaveId && node.threadId && (node.contextValue as string | undefined)?.startsWith('thread')) {
                this.threadKeyToNode.set(`${node.weaveId}/${node.threadId}`, node);
            }
            if (node.children?.length) this.buildNodeMaps(node.children, node);
        }
    }

    getNodeByWeaveId(weaveId: string): TreeNode | undefined {
        return this.weaveIdToNode.get(weaveId);
    }

    getNodeByThreadId(weaveId: string, threadId: string): TreeNode | undefined {
        return this.threadKeyToNode.get(`${weaveId}/${threadId}`);
    }

    private async getRootChildren(): Promise<TreeNode[]> {
        const pendingCallbacks = this._afterRefreshCallbacks.splice(0);

        if (!this.workspaceRoot) {
            pendingCallbacks.forEach(cb => cb());
            return [this.messageNode('No workspace open')];
        }

        // Whether this is an initialised Loom workspace is derived from the
        // loom://state read below (empty/!state ⇒ empty tree), not a direct
        // fs.existsSync('.loom') probe — the extension never touches fs.
        this.filePathToNode.clear();
        this.nodeToParent.clear();
        this.weaveIdToNode.clear();
        this.threadKeyToNode.clear();

        try {
            const json = await this.readStateWithRetry(this.workspaceRoot);
            const newState = JSON.parse(json) as LoomState;
            this._onMCPStateChange.fire();
            this.state = newState;
            this.lastGoodState = newState;

            if (!this.state) {
                pendingCallbacks.forEach(cb => cb());
                return [];
            }

            if (this.state.weaves.length === 0) {
                pendingCallbacks.forEach(cb => cb());
                return [];
            }

            const viewState = this.viewStateManager.getState();

            // Roadmap view: re-lay the tree out into one Roadmap band + History.
            if (viewState.roadmapEnabled) {
                const nodes = await this.getRoadmapChildren(viewState);
                this.buildNodeMaps(nodes, undefined);
                pendingCallbacks.forEach(cb => cb());
                return nodes;
            }

            const filtered = this.filterWeaves(this.state.weaves, viewState);

            const globalDocs = (this.state as any).globalDocs as Document[] | undefined;
            const globalCtxDocs = globalDocs?.filter(d => d.type === 'ctx') ?? [];
            const globalRefDocs = globalDocs?.filter(d => (d as any).type === 'reference') ?? [];

            const refsWeave = filtered.find(w => w.id === 'refs');
            const normalWeaves = filtered.filter(w => w.id !== 'refs');
            const nodes = this.groupWeaves(normalWeaves, viewState.grouping);

            // Summary warning row — shown only when there are stale docs or blocked steps.
            // The stale count is the total actionable set the server attached per thread
            // (canonical staleEntries) — axis-agnostic, so it includes stale reqs too.
            const { blockedSteps, reqCoverageGaps } = this.state.summary;
            const staleDocs = (this.state.weaves ?? []).reduce(
                (n, w) => n + (w.threads ?? []).reduce((m, t) => m + (t.stale?.length ?? 0), 0), 0);
            const coverageGaps = reqCoverageGaps ?? 0;
            if (staleDocs > 0 || blockedSteps > 0 || coverageGaps > 0) {
                const parts: string[] = [];
                if (staleDocs > 0) parts.push(`${staleDocs} stale`);
                if (blockedSteps > 0) parts.push(`${blockedSteps} plan steps blocked`);
                if (coverageGaps > 0) parts.push(`${coverageGaps} req coverage gaps`);
                const warningNode = new vscode.TreeItem(`⚠️ ${parts.join(' · ')}`, vscode.TreeItemCollapsibleState.None);
                warningNode.contextValue = 'summary-warning';
                warningNode.iconPath = new vscode.ThemeIcon('warning');
                nodes.unshift(warningNode);
            }

            // Archive section — shown when showArchived is toggled on. The archive unit
            // is the whole thread (loom/.archive/{weave}/{thread}); each is one restorable/
            // deletable item labelled {weave}/{thread}. No doc-level archive nodes.
            const archivedThreads = (this.state as any).archivedThreads as Thread[] | undefined;
            if (viewState.showArchived) {
                const archiveChildren: TreeNode[] = [...(archivedThreads ?? [])]
                    .sort((a, b) => `${a.weaveId}/${a.id}`.localeCompare(`${b.weaveId}/${b.id}`))
                    .map(t => this.tagArchived(
                        { ...this.createThreadNode(t, t.weaveId), label: `${t.weaveId}/${t.id}` },
                        true,
                    ));
                const archiveSection = this.createSectionNode(
                    archiveChildren.length > 0 ? 'Archive' : 'Archive (empty)',
                    archiveChildren
                );
                archiveSection.iconPath = new vscode.ThemeIcon('archive');
                nodes.push(archiveSection);
            }

            // Special global sections come after all regular weave nodes
            if (globalCtxDocs.length > 0) {
                nodes.push(this.createCtxSection(globalCtxDocs));
            }

            if (refsWeave) {
                const refsChats = refsWeave.chats ?? [];
                const refsFromWeave = [...refsWeave.looseFibers, ...(refsWeave.refDocs ?? [])];
                const allGlobalRefs = [...globalRefDocs, ...refsFromWeave];
                const refsChildren: TreeNode[] = [];
                refsChildren.push(this.createChatsSection(
                    refsChats.map(c => this.createChatNode(c, 'refs')),
                    'refs'
                ));
                refsChildren.push(
                    ...[...allGlobalRefs]
                        .sort((a, b) => (a.title ?? '').localeCompare(b.title ?? ''))
                        .map(d => this.createDocumentNode(d, 'reference', 'refs'))
                );
                const refsNode = new vscode.TreeItem('Refs', vscode.TreeItemCollapsibleState.Collapsed);
                refsNode.contextValue = 'refs-section';
                refsNode.iconPath = new vscode.ThemeIcon('library');
                nodes.push({ ...refsNode, weaveId: 'refs', children: refsChildren });
            } else if (globalRefDocs.length > 0) {
                nodes.push(this.createRefsSection(globalRefDocs));
            }
            this.buildNodeMaps(nodes, undefined);
            pendingCallbacks.forEach(cb => cb());
            return nodes;
        } catch (e: any) {
            pendingCallbacks.forEach(cb => cb());
            console.error('🧵 Failed to load Loom state:', e);
            const isTimeout = e.message?.includes('32001') || e.message?.includes('timed out');
            if (isTimeout) {
                const node = new vscode.TreeItem('MCP timed out — click to reconnect', vscode.TreeItemCollapsibleState.None);
                node.iconPath = new vscode.ThemeIcon('warning');
                node.contextValue = 'mcp-timeout';
                node.command = { command: 'loom.reconnectMcp', title: 'Reconnect MCP', arguments: [] };
                return [node];
            }
            return [this.messageNode(`Error: ${e.message}`)];
        }
    }

    private async readStateWithRetry(root: string): Promise<string> {
        const MAX_ATTEMPTS = 3;
        const RETRY_DELAY_MS = 500;
        let lastError: Error = new Error('no attempts');
        for (let i = 0; i < MAX_ATTEMPTS; i++) {
            try {
                return await getMCP(root).readResource('loom://state');
            } catch (e: any) {
                const isTimeout = e.message?.includes('32001') || e.message?.includes('timed out');
                if (isTimeout) throw e; // reconnect path — no retry
                lastError = e;
                if (i < MAX_ATTEMPTS - 1) await new Promise(r => setTimeout(r, RETRY_DELAY_MS));
            }
        }
        throw lastError;
    }

    private threadHasBlocked(t: Thread): boolean {
        for (const plan of t.plans) {
            if (plan.status !== 'implementing') continue;
            for (const step of plan.steps ?? []) {
                if (step.status === 'done' || step.status === 'cancelled' || !step.blockedBy?.length) continue;
                for (const blocker of step.blockedBy) {
                    const depById = plan.steps?.find(s => s.id === blocker);
                    if (depById) {
                        if (depById.status !== 'done' && depById.status !== 'cancelled') return true;
                        continue;
                    }
                    const stepMatch = blocker.match(/^Step\s+(\d+)$/i);
                    if (stepMatch) {
                        const stepNum = parseInt(stepMatch[1], 10);
                        const dep = plan.steps?.find(s => s.order === stepNum);
                        if (dep && dep.status !== 'done' && dep.status !== 'cancelled') return true;
                    } else {
                        // Cross-plan blocker: treat as blocked (best-effort, no link index)
                        return true;
                    }
                }
            }
        }
        return false;
    }

    private threadHasStale(t: Thread): boolean {
        // Read the server-computed actionable stale set (canonical `staleEntries`,
        // attached by getState). The extension carries no staleness logic of its own.
        return (t.stale?.length ?? 0) > 0;
    }

    private filterWeaves(weaves: Weave[], viewState: ViewState): Weave[] {
        const text = viewState.textFilter?.toLowerCase() ?? '';
        const statusFilter = viewState.statusFilter;

        return weaves
            .filter(w => {
                if (!text) return true;
                if (w.id.toLowerCase().includes(text)) return true;
                return w.allDocs.some(d =>
                    d.id.toLowerCase().includes(text) ||
                    (d.title ?? '').toLowerCase().includes(text)
                );
            })
            .map(w => {
                if (!statusFilter.length) return w;
                if (w.id === 'refs') return w; // refs weave bypasses status filter — rendered as global References
                const filteredThreads = w.threads.filter(t => {
                    const workflowDocs = [t.idea, t.design, ...t.plans].filter(Boolean) as Document[];
                    if (workflowDocs.length === 0) return false;
                    if (statusFilter.includes('stale')) return this.threadHasStale(t);
                    if (statusFilter.includes('blocked')) return this.threadHasBlocked(t);
                    const status = getThreadStatus(t).toLowerCase();
                    return statusFilter.includes(status);
                });
                return { ...w, threads: filteredThreads };
            })
            .filter(w => {
                if (!statusFilter.length) return true;
                if (w.id === 'refs') return true;
                return w.threads.length > 0;
            });
    }

    // ---------------------------------------------------------------------
    // Roadmap view — a thin renderer over the loom://roadmap read-model. When
    // the Roadmap toggle is on, the tree is re-laid out into two bands: one
    // Roadmap band (present+future in a single dependency+priority order, status
    // per-row, drag-reorderable as a whole) and History (shipped plans). No
    // derivation here.
    // ---------------------------------------------------------------------

    private static readonly ROADMAP_STATUS_ICON: Record<RoadmapStatus, string> = {
        done: 'pass-filled',
        implementing: 'sync',
        active: 'circle-filled',
        pending: 'circle-outline',
        blocked: 'error',
    };

    private async getRoadmapChildren(viewState: ViewState): Promise<TreeNode[]> {
        let roadmap: RoadmapView;
        try {
            const json = await getMCP(this.workspaceRoot!).readResource('loom://roadmap');
            roadmap = JSON.parse(json) as RoadmapView;
        } catch (e: any) {
            this.lastRoadmap = null;
            return [this.messageNode(`Roadmap unavailable: ${e.message}`)];
        }
        this.lastRoadmap = roadmap;

        // ULID → "weave/thread" label, for rendering blocked-on targets by name.
        const label = new Map<string, string>();
        for (const n of roadmap.roadmap) {
            if (n.ulid) label.set(n.ulid, `${n.weaveId}/${n.threadId}`);
        }
        const nameOf = (u: string) => label.get(u) ?? u;

        const nodes: TreeNode[] = [];

        if (roadmap.diagnostics.length > 0) {
            const n = roadmap.diagnostics.length;
            const warn = new vscode.TreeItem(
                `⚠️ ${n} roadmap diagnostic${n === 1 ? '' : 's'}`,
                vscode.TreeItemCollapsibleState.None,
            );
            warn.contextValue = 'roadmap-warning';
            warn.iconPath = new vscode.ThemeIcon('warning');
            warn.tooltip = roadmap.diagnostics.map(d => `${d.kind}: ${d.detail}`).join('\n');
            nodes.push({ ...warn });
        }

        const band = viewState.roadmapBand;
        if (band === 'all' || band === 'roadmap') {
            nodes.push(this.createRoadmapBand(roadmap.roadmap, nameOf));
        }
        if (band === 'all' || band === 'history') {
            nodes.push(this.createHistoryBand(roadmap.history, viewState.historyGrouping, roadmap.currentRelease));
        }
        return nodes;
    }

    private createRoadmapBand(
        bandNodes: RoadmapNode[],
        nameOf: (u: string) => string,
    ): TreeNode {
        const node = new vscode.TreeItem(`Roadmap  (${bandNodes.length})`, vscode.TreeItemCollapsibleState.Expanded);
        node.contextValue = 'roadmap-band-roadmap';
        node.iconPath = new vscode.ThemeIcon('milestone');
        const children = bandNodes.length > 0
            ? bandNodes.map(n => this.createRoadmapNode(n, nameOf))
            : [this.messageNode('(none)')];
        return { ...node, children };
    }

    private createRoadmapNode(n: RoadmapNode, nameOf: (u: string) => string): TreeNode {
        const node = new vscode.TreeItem(`${n.weaveId}/${n.threadId}`, vscode.TreeItemCollapsibleState.None);
        const blocked = n.blockedOn.length ? `⛔ blocked on ${n.blockedOn.map(nameOf).join(', ')}` : '';
        const prio = n.priority !== DEFAULT_ROADMAP_PRIORITY ? `p${n.priority}` : '';
        node.description = [n.status, prio, blocked].filter(Boolean).join(' · ');
        node.iconPath = new vscode.ThemeIcon(LoomTreeProvider.ROADMAP_STATUS_ICON[n.status] ?? 'circle-outline');
        node.tooltip = `${n.title} — ${n.status}${blocked ? `\n${blocked}` : ''}`;
        node.contextValue = 'roadmap-thread';

        const docPath = this.resolveThreadDocPath(n.weaveId, n.threadId);
        if (docPath) {
            node.command = { command: 'vscode.open', title: 'Open', arguments: [vscode.Uri.file(docPath)] };
        }
        return { ...node, weaveId: n.weaveId, threadId: n.threadId, roadmap: n, children: [] };
    }

    private createHistoryBand(history: ShippedPlan[], grouping: HistoryGrouping, currentRelease: string | null): TreeNode {
        const day = (d: string) => (d || '').slice(0, 10);
        let children: TreeNode[];
        if (history.length === 0) {
            children = [this.messageNode('(none)')];
        } else if (grouping === 'release') {
            // Bucket shipped plans by release version, newest version first; the
            // unversioned bucket (plans done but not yet stamped) sorts first —
            // it's the freshest work, ahead of the latest release.
            const byRelease = new Map<string, ShippedPlan[]>();
            for (const h of history) {
                const k = h.release ?? '';
                if (!byRelease.has(k)) byRelease.set(k, []);
                byRelease.get(k)!.push(h);
            }
            const keys = [...byRelease.keys()].sort((a, b) => {
                if (!a) return -1;         // unversioned first
                if (!b) return 1;
                return compareVersions(b, a); // newest version first
            });
            children = keys.map(k => {
                const items = byRelease.get(k)!;
                const sec = new vscode.TreeItem(k ? `v${k}` : 'Unversioned', vscode.TreeItemCollapsibleState.Expanded);
                sec.contextValue = 'roadmap-history-release';
                sec.iconPath = new vscode.ThemeIcon('tag');
                sec.description = `${items.length} shipped`;
                return { ...sec, children: items.map(h => this.createShippedPlanNode(h, day, true, false)) };
            });
        } else if (grouping === 'thread') {
            const byThread = new Map<string, ShippedPlan[]>();
            for (const h of history) {
                const k = `${h.weaveId}/${h.threadId}`;
                if (!byThread.has(k)) byThread.set(k, []);
                byThread.get(k)!.push(h);
            }
            children = [...byThread.entries()].map(([k, items]) => {
                const sec = new vscode.TreeItem(k, vscode.TreeItemCollapsibleState.Expanded);
                sec.contextValue = 'roadmap-history-thread';
                sec.iconPath = new vscode.ThemeIcon('git-commit');
                sec.description = `${items.length} shipped`;
                return { ...sec, children: items.map(h => this.createShippedPlanNode(h, day, false, true)) };
            });
        } else {
            // 'date' — flat, newest first (history arrives date-sorted).
            children = history.map(h => this.createShippedPlanNode(h, day, true, true));
        }
        const node = new vscode.TreeItem(`History  (${history.length})`, vscode.TreeItemCollapsibleState.Expanded);
        node.contextValue = 'roadmap-band-history';
        node.iconPath = new vscode.ThemeIcon('history');
        node.description = currentRelease ? `current v${currentRelease}` : 'no release recorded';
        return { ...node, children };
    }

    private createShippedPlanNode(h: ShippedPlan, day: (d: string) => string, showThread: boolean, showRelease: boolean): TreeNode {
        const rel = h.release ? `v${h.release}` : 'unversioned';
        const parts = [
            ...(showRelease ? [rel] : []),
            day(h.date),
            ...(showThread ? [`${h.weaveId}/${h.threadId}`] : []),
        ];
        const node = new vscode.TreeItem(h.planTitle, vscode.TreeItemCollapsibleState.None);
        node.description = parts.join(' · ');
        node.iconPath = new vscode.ThemeIcon('check-all');
        node.contextValue = 'roadmap-shipped-plan';
        node.tooltip = `${h.planTitle}\nshipped ${rel} on ${day(h.date)} — ${h.weaveId}/${h.threadId}`;
        const planPath = this.resolvePlanPath(h.planId);
        if (planPath) {
            node.command = { command: 'vscode.open', title: 'Open Plan', arguments: [vscode.Uri.file(planPath)] };
        }
        return { ...node, weaveId: h.weaveId, threadId: h.threadId, children: [] };
    }

    private findThreadInState(weaveId: string, threadId: string): Thread | undefined {
        return this.state?.weaves.find(w => w.id === weaveId)?.threads.find(t => t.id === threadId);
    }

    /** Best-effort path to open for a roadmap thread node: design, then idea, then manifest. */
    private resolveThreadDocPath(weaveId: string, threadId: string): string | undefined {
        const t = this.findThreadInState(weaveId, threadId);
        const doc = t?.design ?? t?.idea ?? t?.manifest;
        return (doc as any)?._path;
    }

    private resolvePlanPath(planId: string): string | undefined {
        for (const w of this.state?.weaves ?? []) {
            for (const t of w.threads) {
                const p = t.plans.find(pl => pl.id === planId);
                if (p) return (p as any)._path;
            }
        }
        return undefined;
    }

    private groupWeaves(weaves: Weave[], grouping: GroupingMode): TreeNode[] {
        switch (grouping) {
            case 'type':
                return this.groupByType(weaves);
            case 'status':
                return this.groupByStatus(weaves);
            case 'release':
                return this.groupByRelease(weaves);
            case 'thread':
            default:
                return weaves.map(w => this.createWeaveNode(w));
        }
    }

    private groupByType(weaves: Weave[]): TreeNode[] {
        const groups: Record<string, Document[]> = { req: [], idea: [], design: [], plan: [], ctx: [], reference: [] };
        for (const weave of weaves) {
            const threadDocs = weave.threads.flatMap(t =>
                [t.req, t.idea, t.design, ...t.plans, ...t.dones, ...(t.refDocs ?? [])].filter(Boolean) as Document[]
            );
            for (const doc of [...threadDocs, ...weave.looseFibers, ...(weave.refDocs ?? [])]) {
                if (groups[doc.type] !== undefined) groups[doc.type].push(doc);
            }
        }
        return Object.entries(groups)
            .filter(([, docs]) => docs.length > 0)
            .map(([type, docs]) => this.createSectionNode(
                type.charAt(0).toUpperCase() + type.slice(1) + 's',
                docs.map(d => this.createDocumentNode(d, type))
            ));
    }

    private groupByStatus(weaves: Weave[]): TreeNode[] {
        const groups: Record<string, Document[]> = {};
        for (const weave of weaves) {
            const allDocs = [
                ...weave.threads.flatMap(t =>
                    [t.idea, t.design, ...t.plans].filter(Boolean) as Document[]
                ),
                ...weave.looseFibers,
            ];
            for (const doc of allDocs) {
                if (!groups[doc.status]) groups[doc.status] = [];
                groups[doc.status].push(doc);
            }
        }
        return Object.entries(groups).map(([status, docs]) =>
            this.createSectionNode(status, docs.map(d => this.createDocumentNode(d, d.type)))
        );
    }

    private groupByRelease(weaves: Weave[]): TreeNode[] {
        const groups: Record<string, Document[]> = {};
        const add = (release: string | null | undefined, doc: Document) => {
            const key = release && release.trim() ? release : 'unspecified';
            (groups[key] ??= []).push(doc);
        };
        for (const weave of weaves) {
            for (const thread of weave.threads) {
                // Plans are the carrier of the shipped release (`actual_release`):
                // group each plan by its own release. The design rides under the
                // thread's latest shipped release, or "No Release" until a plan ships.
                const planReleases: (string | null | undefined)[] = [];
                thread.plans.forEach(p => {
                    add(p.actual_release, p);
                    planReleases.push(p.actual_release);
                });
                if (thread.design) add(maxVersion(planReleases), thread.design);
            }
        }
        return Object.entries(groups).map(([release, docs]) =>
            this.createSectionNode(
                release === 'unspecified' ? 'No Release' : `v${release}`,
                docs.map(d => this.createDocumentNode(d, d.type))
            )
        );
    }

    private messageNode(text: string): TreeNode {
        const node = new vscode.TreeItem(text, vscode.TreeItemCollapsibleState.None);
        node.contextValue = 'message';
        return node;
    }

    /**
     * Tag an archived subtree so menus can gate on it: top-level archived items get
     * contextValue 'archived' (only Restore + Delete apply); every descendant gets
     * 'archived-child' (no actions — you restore/delete the whole archived unit).
     * The node's weaveId/threadId/doc are left intact so the commands can act.
     */
    private tagArchived(node: TreeNode, isTop: boolean): TreeNode {
        const tagged: TreeNode = { ...node, contextValue: isTop ? 'archived' : 'archived-child' };
        if (node.children) tagged.children = (node.children as TreeNode[]).map(c => this.tagArchived(c, false));
        return tagged;
    }

    private createWeaveNode(weave: Weave, isArchived = false): TreeNode {
        const status = getWeaveStatus(weave);
        const children = this.getWeaveChildren(weave);
        const state = children.length > 0
            ? vscode.TreeItemCollapsibleState.Collapsed
            : vscode.TreeItemCollapsibleState.None;
        const node = new vscode.TreeItem(weave.id, state);
        node.description = isArchived ? 'archived' : status;
        node.iconPath = isArchived ? new vscode.ThemeIcon('archive') : getWeaveIcon(status);
        node.contextValue = isArchived ? 'weave-archived' : 'weave';
        const primaryThread = weave.threads.find(t => t.design);
        node.tooltip = primaryThread?.design
            ? `${primaryThread.design.title} (v${primaryThread.design.version})`
            : weave.id;

        return { ...node, weaveId: weave.id, children };
    }

    private getWeaveChildren(weave: Weave): TreeNode[] {
        // Per-doc stale ids come straight from the server-computed actionable set
        // (canonical `staleEntries`, attached per thread by getState) — no local recompute.
        const staleIds = new Set<string>();
        for (const thread of weave.threads) {
            for (const e of thread.stale ?? []) staleIds.add(e.docId);
        }

        const children: TreeNode[] = [];

        for (const thread of weave.threads) {
            children.push(this.createThreadNode(thread, weave.id, staleIds));
        }

        const ctxFibers = weave.looseFibers.filter(f => f.type === 'ctx');
        const otherFibers = weave.looseFibers.filter(f => f.type !== 'ctx');

        if (otherFibers.length > 0) {
            children.push(this.createSectionNode(
                'Loose Fibers',
                otherFibers.map(f => this.createDocumentNode(f, `loose-${f.type}`, weave.id))
            ));
        }

        // Special sections at end: Context, References
        if (ctxFibers.length > 0) {
            children.push(this.createCtxSection(ctxFibers, weave.id));
        }

        if (weave.refDocs && weave.refDocs.length > 0) {
            children.push(this.createRefsSection(weave.refDocs, weave.id));
        }

        return children;
    }

    private createThreadNode(thread: Thread, weaveId: string, staleIds: Set<string> = new Set()): TreeNode {
        const status = getThreadStatus(thread);
        const children = this.getThreadChildren(thread, weaveId, staleIds);
        const state = children.length > 0
            ? vscode.TreeItemCollapsibleState.Collapsed
            : vscode.TreeItemCollapsibleState.None;
        const node = new vscode.TreeItem(thread.id, state);
        node.description = thread.design?.title ?? status;
        node.iconPath = getThreadIcon(status);
        node.tooltip = thread.design
            ? `${thread.design.title} (v${thread.design.version})`
            : thread.id;

        // Encode thread constraint state so when clauses can show/hide AI buttons
        let contextValue = 'thread';
        if (thread.idea) contextValue += '-has-idea';
        if (thread.design) contextValue += '-has-design';
        if (thread.req) contextValue += '-has-req';
        const hasCtx = thread.allDocs?.some(d => d.type === 'ctx');
        if (hasCtx) contextValue += '-has-ctx';
        node.contextValue = contextValue;

        return { ...node, weaveId, threadId: thread.id, children };
    }

    private getThreadChildren(thread: Thread, weaveId: string, staleIds: Set<string> = new Set()): TreeNode[] {
        const children: TreeNode[] = [];

        // req is the thread's authoritative spec — render it first (chain position),
        // with a lock badge when locked.
        if (thread.req) {
            const reqNode = this.createDocumentNode(thread.req, 'req', weaveId, thread.id, staleIds);
            if (thread.req.status === 'locked') {
                // Surface the structural coverage result right on the req node, so the
                // cheapest always-on check has a visible home (not just the global
                // summary row + the on-demand Verify command).
                const cov = thread.reqCoverage;
                let description = '🔒 locked';
                if (cov) {
                    const gaps = cov.uncovered.length + cov.excludedViolations.length + cov.unknownCitations.length;
                    description += gaps > 0
                        ? ` · ⚠️ ${gaps} ${gaps === 1 ? 'gap' : 'gaps'}`
                        : ' · ✅ covered';
                }
                reqNode.description = description;
            }
            children.push(reqNode);
        }

        if (thread.idea) {
            children.push(this.createDocumentNode(thread.idea, 'idea', weaveId, thread.id, staleIds));
        }

        if (thread.design) {
            children.push(this.createDocumentNode(thread.design, 'design', weaveId, thread.id, staleIds));
        }

        if (thread.plans.length > 0) {
            children.push(this.createPlansSection(
                thread.plans.map(p => {
                    const doneDoc = thread.dones.find(d => d.parent_id === p.id);
                    return this.createPlanNode(p, weaveId, doneDoc, thread.id, thread.design);
                })
            ));
        }

        const planIds = new Set(thread.plans.map(p => p.id));
        const orphanedDones = thread.dones.filter(d => !planIds.has(d.parent_id ?? ''));
        if (orphanedDones.length > 0) {
            children.push(this.createSectionNode(
                'Done (orphaned)',
                orphanedDones.map(d => this.createDoneDocNode(d, weaveId, thread.id))
            ));
        }

        children.push(this.createChatsSection(
            thread.chats.map(c => this.createChatNode(c, weaveId, thread.id)),
            weaveId, thread.id
        ));

        const ctxDocs = thread.allDocs.filter(d => d.type === 'ctx');
        if (ctxDocs.length > 0) {
            children.push(this.createCtxSection(ctxDocs, weaveId, thread.id));
        }

        if (thread.refDocs && thread.refDocs.length > 0) {
            children.push(this.createRefsSection(thread.refDocs, weaveId, thread.id));
        }

        return children;
    }

    private createCtxSection(ctxDocs: Document[], weaveId?: string, threadId?: string): TreeNode {
        const node = new vscode.TreeItem('Context', vscode.TreeItemCollapsibleState.Collapsed);
        node.contextValue = 'ctx-section';
        node.iconPath = new vscode.ThemeIcon('note');
        const children = ctxDocs.map(d => this.createDocumentNode(d, 'ctx', weaveId, threadId));
        return { ...node, weaveId, threadId, children };
    }

    private createRefsSection(refDocs: Document[], weaveId?: string, threadId?: string): TreeNode {
        const node = new vscode.TreeItem('References', vscode.TreeItemCollapsibleState.Collapsed);
        node.contextValue = 'refs-section';
        node.iconPath = new vscode.ThemeIcon('library');
        const children = [...refDocs]
            .sort((a, b) => (a.title ?? '').localeCompare(b.title ?? ''))
            .map(d => this.createDocumentNode(d, 'reference', weaveId, threadId));
        return { ...node, weaveId, threadId, children };
    }

    private createChatsSection(chatNodes: TreeNode[], weaveId?: string, threadId?: string): TreeNode {
        const state = chatNodes.length > 0
            ? vscode.TreeItemCollapsibleState.Collapsed
            : vscode.TreeItemCollapsibleState.None;
        const node = new vscode.TreeItem('Chats', state);
        node.contextValue = 'chats-section';
        node.iconPath = new vscode.ThemeIcon('comment-discussion');
        return { ...node, weaveId, threadId, children: chatNodes };
    }

    private createPlansSection(planNodes: TreeNode[]): TreeNode {
        const node = new vscode.TreeItem('Plans', vscode.TreeItemCollapsibleState.Collapsed);
        node.contextValue = 'plans-section';
        node.iconPath = new vscode.ThemeIcon('checklist');
        return { ...node, children: planNodes };
    }

    private createSectionNode(label: string, children: TreeNode[]): TreeNode {
        const node = new vscode.TreeItem(label, vscode.TreeItemCollapsibleState.Collapsed);
        node.contextValue = 'section';
        return { ...node, children };
    }

    private createDocumentNode(doc: Document, baseContextValue: string, weaveId?: string, threadId?: string, staleIds?: Set<string>): TreeNode {
        const isDraft = doc.status === 'draft';
        const contextValue = isDraft ? `${baseContextValue}-temp` : baseContextValue;
        const node = new vscode.TreeItem(String(doc.title || doc.id), vscode.TreeItemCollapsibleState.None);
        const isStale = staleIds?.has(doc.id) ?? false;
        node.description = isStale ? `${doc.status} ⚠️ stale` : doc.status;
        node.iconPath = getDocumentIcon(doc.type);
        node.contextValue = contextValue;
        node.tooltip = isStale ? `${doc.type} • ${doc.status} ⚠️ stale` : `${doc.type} • ${doc.status}`;

        const filePath = (doc as any)._path;
        if (filePath) {
            node.command = {
                command: 'vscode.open',
                title: 'Open Document',
                arguments: [vscode.Uri.file(filePath)],
            };
        }

        return { ...node, doc, weaveId, threadId, children: [] };
    }

    private createChatNode(chat: ChatDoc, weaveId?: string, threadId?: string): TreeNode {
        const node = new vscode.TreeItem(String(chat.title || chat.id), vscode.TreeItemCollapsibleState.None);
        node.description = chat.status;
        node.iconPath = icon(Icons.chat);
        node.contextValue = (weaveId === 'refs' && !threadId) ? 'chat-refs' : 'chat';
        node.tooltip = `chat • ${chat.status}`;

        const filePath = (chat as any)._path;
        if (filePath) {
            node.command = {
                command: 'vscode.open',
                title: 'Open Chat',
                arguments: [vscode.Uri.file(filePath)],
            };
        }

        return { ...node, doc: chat, weaveId, threadId, children: [] };
    }

    private createPlanNode(plan: PlanDoc, weaveId?: string, doneDoc?: DoneDoc, threadId?: string, design?: DesignDoc): TreeNode {
        const hasDone = !!doneDoc;
        const node = new vscode.TreeItem(String(plan.title || plan.id), hasDone ? vscode.TreeItemCollapsibleState.Collapsed : vscode.TreeItemCollapsibleState.None);
        const doneSteps = plan.steps?.filter(s => s.status === 'done').length ?? 0;
        const totalSteps = plan.steps?.length ?? 0;
        const nextStep = plan.steps?.find(s => s.status !== 'done' && s.status !== 'cancelled');
        const progress = `${doneSteps}/${totalSteps}`;
        const isStale = (design && plan.status !== 'done' && plan.status !== 'cancelled')
            ? plan.design_version < design.version
            : false;
        const pendingSteps = (plan.steps ?? []).filter(s => s.status !== 'done' && s.status !== 'cancelled');
        const hasPending = pendingSteps.length > 0;
        const blockedCount = this.state
            ? pendingSteps.filter(s => isStepBlocked(s, plan, this.state!.index)).length
            : 0;
        const allPendingBlocked = hasPending && pendingSteps.length === blockedCount;
        if (isStale) {
            node.description = `${progress} · ${plan.status} ⚠️ stale`;
        } else if (plan.status === 'implementing' && allPendingBlocked) {
            node.description = `${progress} · ${blockedCount} blocked 🚫`;
        } else if (plan.status === 'implementing' && blockedCount > 0 && nextStep) {
            const firstUnblocked = this.state
                ? pendingSteps.find(s => !isStepBlocked(s, plan, this.state!.index))
                : nextStep;
            const stepToShow = firstUnblocked ?? nextStep;
            const label = stepToShow.description.length > 35
                ? stepToShow.description.slice(0, 35) + '…'
                : stepToShow.description;
            node.description = `${progress} · Step ${stepToShow.order}: ${label} (${blockedCount} blocked)`;
        } else if (nextStep && plan.status === 'implementing') {
            const label = nextStep.description.length > 35
                ? nextStep.description.slice(0, 35) + '…'
                : nextStep.description;
            node.description = `${progress} · Step ${nextStep.order}: ${label}`;
        } else {
            node.description = `${progress} · ${plan.status}`;
        }
        node.tooltip = nextStep
            ? `${plan.status} • ${progress} steps\nNext: Step ${nextStep.order} — ${nextStep.description}`
            : `${plan.status} • ${progress} steps`;
        node.iconPath = getPlanIcon(plan.status);
        node.contextValue = (plan.status === 'implementing' && allPendingBlocked)
            ? 'plan-implementing-blocked'
            : (plan.status === 'implementing' && hasPending ? 'plan-implementing-doable' : `plan-${plan.status}`);

        const filePath = (plan as any)._path;
        if (filePath) {
            node.command = {
                command: 'vscode.open',
                title: 'Open Plan',
                arguments: [vscode.Uri.file(filePath)],
            };
        }

        const children: TreeNode[] = doneDoc ? [this.createDoneDocNode(doneDoc, weaveId, threadId)] : [];
        return { ...node, doc: plan, weaveId, threadId, children };
    }

    private createDoneDocNode(done: DoneDoc, weaveId?: string, threadId?: string): TreeNode {
        const node = new vscode.TreeItem(String(done.title || done.id), vscode.TreeItemCollapsibleState.None);
        node.description = 'done';
        node.iconPath = new vscode.ThemeIcon('check-all');
        node.contextValue = 'done';
        node.tooltip = `done doc — ${done.id}`;

        const filePath = (done as any)._path;
        if (filePath) {
            node.command = {
                command: 'vscode.open',
                title: 'Open Done Doc',
                arguments: [vscode.Uri.file(filePath)],
            };
        }

        return { ...node, doc: done, weaveId, threadId, children: [] };
    }
}
