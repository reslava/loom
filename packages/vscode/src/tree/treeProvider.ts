import * as vscode from 'vscode';
import * as path from 'path';
import * as fs from 'fs-extra';
import { getMCP } from '../mcp-client';
import { LoomState } from '@reslava-loom/core/dist/entities/state';
import { Weave } from '@reslava-loom/core/dist/entities/weave';
import { Thread } from '@reslava-loom/core/dist/entities/thread';
import { Document } from '@reslava-loom/core/dist/entities/document';
import { PlanDoc } from '@reslava-loom/core/dist/entities/plan';
import { ChatDoc } from '@reslava-loom/core/dist/entities/chat';
import { DoneDoc } from '@reslava-loom/core/dist/entities/done';
import { getWeaveStatus, getThreadStatus } from '@reslava-loom/core/dist/derived';
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

    private state: LoomState | null = null;
    private workspaceRoot: string | undefined;

    constructor(private viewStateManager: ViewStateManager) {}

    setWorkspaceRoot(root: string | undefined): void {
        this.workspaceRoot = root;
    }

    refresh(): void {
        this._onDidChangeTreeData.fire();
    }

    async getTreeItem(element: TreeNode): Promise<vscode.TreeItem> {
        return element;
    }

    async getChildren(element?: TreeNode): Promise<TreeNode[]> {
        if (!element) {
            return this.getRootChildren();
        }
        return element.children ?? [];
    }

    private async getRootChildren(): Promise<TreeNode[]> {
        if (!this.workspaceRoot) {
            return [this.messageNode('No workspace open')];
        }

        const loomDir = path.join(this.workspaceRoot, '.loom');
        if (!fs.existsSync(loomDir)) {
            return [this.messageNode('No .loom directory found in workspace')];
        }

        try {
            const json = await getMCP(this.workspaceRoot).readResource('loom://state');
            this.state = JSON.parse(json) as LoomState;

            if (this.state.weaves.length === 0) {
                return [this.messageNode('No weaves found')];
            }

            const viewState = this.viewStateManager.getState();
            const filtered = this.filterWeaves(this.state.weaves, viewState);
            return this.groupWeaves(filtered, viewState.grouping);
        } catch (e: any) {
            console.error('🧵 Failed to load Loom state:', e);
            return [this.messageNode(`Error: ${e.message}`)];
        }
    }

    private filterWeaves(weaves: Weave[], viewState: ViewState): Weave[] {
        const text = viewState.textFilter?.toLowerCase() ?? '';
        const statusFilter = viewState.statusFilter;

        return weaves
            .filter(w => viewState.showArchived || !w.id.startsWith('_'))
            .filter(w => {
                if (!text) return true;
                if (w.id.toLowerCase().includes(text)) return true;
                return w.allDocs.some(d =>
                    d.id.toLowerCase().includes(text) ||
                    (d.title ?? '').toLowerCase().includes(text)
                );
            })
            .filter(w => {
                if (!statusFilter.length) return true;
                if (w.allDocs.length === 0) return true;
                return w.allDocs.some(d => statusFilter.includes(d.status));
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
        const groups: Record<string, Document[]> = { idea: [], design: [], plan: [], ctx: [] };
        for (const weave of weaves) {
            const threadDocs = weave.threads.flatMap(t =>
                [t.idea, t.design, ...t.plans, ...t.dones].filter(Boolean) as Document[]
            );
            for (const doc of [...threadDocs, ...weave.looseFibers]) {
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

    private createWeaveNode(weave: Weave): TreeNode {
        const status = getWeaveStatus(weave);
        const children = this.getWeaveChildren(weave);
        const state = children.length > 0
            ? vscode.TreeItemCollapsibleState.Collapsed
            : vscode.TreeItemCollapsibleState.None;
        const node = new vscode.TreeItem(weave.id, state);
        node.description = status;
        node.iconPath = getWeaveIcon(status);
        node.contextValue = 'weave';
        const primaryThread = weave.threads.find(t => t.design);
        node.tooltip = primaryThread?.design
            ? `${primaryThread.design.title} (v${primaryThread.design.version})`
            : weave.id;

        return { ...node, weaveId: weave.id, children };
    }

    private getWeaveChildren(weave: Weave): TreeNode[] {
        const children: TreeNode[] = [];

        for (const thread of weave.threads) {
            children.push(this.createThreadNode(thread, weave.id));
        }

        if (weave.looseFibers.length > 0) {
            children.push(this.createSectionNode(
                'Loose Fibers',
                weave.looseFibers.map(f =>
                    this.createDocumentNode(f, `loose-${f.type}`, weave.id)
                )
            ));
        }

        if (weave.chats.length > 0) {
            children.push(this.createSectionNode(
                'Chats',
                weave.chats.map(c => this.createChatNode(c, weave.id))
            ));
        }

        return children;
    }

    private createThreadNode(thread: Thread, weaveId: string): TreeNode {
        const status = getThreadStatus(thread);
        const children = this.getThreadChildren(thread, weaveId);
        const state = children.length > 0
            ? vscode.TreeItemCollapsibleState.Collapsed
            : vscode.TreeItemCollapsibleState.None;
        const node = new vscode.TreeItem(thread.id, state);
        node.description = thread.design?.title ?? status;
        node.iconPath = getThreadIcon(status);
        node.contextValue = 'thread';
        node.tooltip = thread.design
            ? `${thread.design.title} (v${thread.design.version})`
            : thread.id;

        return { ...node, weaveId, threadId: thread.id, children };
    }

    private getThreadChildren(thread: Thread, weaveId: string): TreeNode[] {
        const children: TreeNode[] = [];

        if (thread.idea) {
            children.push(this.createDocumentNode(thread.idea, 'idea', weaveId, thread.id));
        }

        if (thread.design) {
            children.push(this.createDocumentNode(thread.design, 'design', weaveId, thread.id));
        }

        if (thread.plans.length > 0) {
            children.push(this.createSectionNode(
                'Plans',
                thread.plans.map(p => {
                    const doneDoc = thread.dones.find(d => d.parent_id === p.id);
                    return this.createPlanNode(p, weaveId, doneDoc, thread.id);
                })
            ));
        }

        if (thread.chats.length > 0) {
            children.push(this.createSectionNode(
                'Chats',
                thread.chats.map(c => this.createChatNode(c, weaveId, thread.id))
            ));
        }

        return children;
    }

    private createSectionNode(label: string, children: TreeNode[]): TreeNode {
        const node = new vscode.TreeItem(label, vscode.TreeItemCollapsibleState.Collapsed);
        node.contextValue = 'section';
        return { ...node, children };
    }

    private createDocumentNode(doc: Document, baseContextValue: string, weaveId?: string, threadId?: string): TreeNode {
        const isTemp = doc.id.startsWith('new-');
        const contextValue = isTemp ? `${baseContextValue}-temp` : baseContextValue;
        const node = new vscode.TreeItem(doc.title || doc.id, vscode.TreeItemCollapsibleState.None);
        node.description = doc.status;
        node.iconPath = getDocumentIcon(doc.type);
        node.contextValue = contextValue;
        node.tooltip = `${doc.type} • ${doc.status}`;

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
        node.contextValue = 'chat';
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

    private createPlanNode(plan: PlanDoc, weaveId?: string, doneDoc?: DoneDoc, threadId?: string): TreeNode {
        const hasDone = !!doneDoc;
        const node = new vscode.TreeItem(plan.title || plan.id, hasDone ? vscode.TreeItemCollapsibleState.Collapsed : vscode.TreeItemCollapsibleState.None);
        const doneSteps = plan.steps?.filter(s => s.done).length ?? 0;
        const totalSteps = plan.steps?.length ?? 0;
        const nextStep = plan.steps?.find(s => !s.done);
        const progress = `${doneSteps}/${totalSteps}`;
        if (plan.staled) {
            node.description = `${plan.status} ⚠️ stale`;
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
        const hasPending = (plan.steps ?? []).some(s => !s.done);
        node.contextValue = (plan.status === 'implementing' && hasPending)
            ? 'plan-implementing-doable'
            : `plan-${plan.status}`;

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
        node.description = 'final';
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
