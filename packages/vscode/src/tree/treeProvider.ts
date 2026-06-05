import * as vscode from 'vscode';
import * as path from 'path';
import * as fs from 'fs-extra';
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
import { isStepBlocked } from '@reslava-loom/core/dist/planUtils';
import { ViewStateManager } from '../view/viewStateManager';
import { GroupingMode, ViewState } from '../view/viewState';
import { Icons, icon, getDocumentIcon, getWeaveIcon, getThreadIcon, getPlanIcon } from '../icons';

export interface TreeNode extends vscode.TreeItem {
    children?: TreeNode[];
    weaveId?: string;
    threadId?: string;
    doc?: Document;
}

export class LoomTreeProvider implements vscode.TreeDataProvider<TreeNode> {
    private _onDidChangeTreeData = new vscode.EventEmitter<TreeNode | undefined | void>();
    readonly onDidChangeTreeData = this._onDidChangeTreeData.event;

    private _onMCPStateChange = new vscode.EventEmitter<void>();
    readonly onMCPStateChange = this._onMCPStateChange.event;

    private state: LoomState | null = null;
    private lastGoodState: LoomState | null = null;
    private workspaceRoot: string | undefined;

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

        const loomDir = path.join(this.workspaceRoot, '.loom');
        if (!fs.existsSync(loomDir)) {
            pendingCallbacks.forEach(cb => cb());
            return [];
        }

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
            const filtered = this.filterWeaves(this.state.weaves, viewState);

            const globalDocs = (this.state as any).globalDocs as Document[] | undefined;
            const globalCtxDocs = globalDocs?.filter(d => d.type === 'ctx') ?? [];
            const globalRefDocs = globalDocs?.filter(d => (d as any).type === 'reference') ?? [];

            const refsWeave = filtered.find(w => w.id === 'refs');
            const normalWeaves = filtered.filter(w => w.id !== 'refs');
            const nodes = this.groupWeaves(normalWeaves, viewState.grouping);

            // Summary warning row — shown only when there are stale plans or blocked steps
            const { stalePlans, staleIdeas, staleDesigns, blockedSteps } = this.state.summary;
            const staleDocs = (stalePlans ?? 0) + (staleIdeas ?? 0) + (staleDesigns ?? 0);
            if (staleDocs > 0 || blockedSteps > 0) {
                const parts: string[] = [];
                if (staleDocs > 0) parts.push(`${staleDocs} stale`);
                if (blockedSteps > 0) parts.push(`${blockedSteps} plan steps blocked`);
                const warningNode = new vscode.TreeItem(`⚠️ ${parts.join(' · ')}`, vscode.TreeItemCollapsibleState.None);
                warningNode.contextValue = 'summary-warning';
                warningNode.iconPath = new vscode.ThemeIcon('warning');
                nodes.unshift(warningNode);
            }

            // Archive section — shown when showArchived is toggled on
            const archivedWeaves = (this.state as any).archivedWeaves as Weave[] | undefined;
            const archivedLooseDocs = (this.state as any).archivedLooseDocs as Document[] | undefined;
            if (viewState.showArchived) {
                const archiveChildren: TreeNode[] = [
                    ...[...(archivedWeaves ?? [])].sort((a, b) => a.id.localeCompare(b.id)).map(w => this.createWeaveNode(w, true)),
                    ...[...(archivedLooseDocs ?? [])].sort((a, b) => (a.title ?? a.id).localeCompare(b.title ?? b.id)).map(d => this.createDocumentNode(d, `loose-${d.type}`, undefined)),
                ];
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
                if (step.done || !step.blockedBy?.length) continue;
                for (const blocker of step.blockedBy) {
                    const stepMatch = blocker.match(/^Step\s+(\d+)$/i);
                    if (stepMatch) {
                        const stepNum = parseInt(stepMatch[1], 10);
                        const dep = plan.steps?.find(s => s.order === stepNum);
                        if (dep && !dep.done) return true;
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
        if (t.design) {
            for (const plan of t.plans) {
                if (plan.status !== 'done' && plan.status !== 'cancelled' && plan.design_version < t.design.version) {
                    return true;
                }
            }
        }
        if (t.idea && t.design) {
            const designUpdated = t.design.updated ?? '';
            const ideaUpdated = t.idea.updated ?? '';
            if (designUpdated > ideaUpdated && t.idea.status !== 'done') return true;
            if (ideaUpdated > designUpdated && t.design.status !== 'done' && t.design.status !== 'closed') return true;
        }
        return false;
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
        for (const weave of weaves) {
            for (const thread of weave.threads) {
                const release = (thread.design as any)?.target_release || 'unspecified';
                if (!groups[release]) groups[release] = [];
                if (thread.design) groups[release].push(thread.design);
                thread.plans.forEach(p => groups[release].push(p));
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
        const staleIds = new Set<string>();
        for (const thread of weave.threads) {
            if (thread.idea && thread.design) {
                const designUpdated = thread.design.updated ?? '';
                const ideaUpdated = thread.idea.updated ?? '';
                if (designUpdated > ideaUpdated && thread.idea.status !== 'done') staleIds.add(thread.idea.id);
                if (ideaUpdated > designUpdated && thread.design.status !== 'done' && thread.design.status !== 'closed') staleIds.add(thread.design.id);
            }
            if (thread.design) {
                for (const plan of thread.plans) {
                    if (plan.design_version < thread.design.version) staleIds.add(plan.id);
                }
            }
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
            if (thread.req.status === 'locked') reqNode.description = '🔒 locked';
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
        const node = new vscode.TreeItem(doc.title || doc.id, vscode.TreeItemCollapsibleState.None);
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
        const node = new vscode.TreeItem(chat.title || chat.id, vscode.TreeItemCollapsibleState.None);
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
        const node = new vscode.TreeItem(plan.title || plan.id, hasDone ? vscode.TreeItemCollapsibleState.Collapsed : vscode.TreeItemCollapsibleState.None);
        const doneSteps = plan.steps?.filter(s => s.done).length ?? 0;
        const totalSteps = plan.steps?.length ?? 0;
        const nextStep = plan.steps?.find(s => !s.done);
        const progress = `${doneSteps}/${totalSteps}`;
        const isStale = (design && plan.status !== 'done' && plan.status !== 'cancelled')
            ? plan.design_version < design.version
            : false;
        const pendingSteps = (plan.steps ?? []).filter(s => !s.done);
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
        const node = new vscode.TreeItem(done.title || done.id, vscode.TreeItemCollapsibleState.None);
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
