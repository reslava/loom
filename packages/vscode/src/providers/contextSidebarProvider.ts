import * as vscode from 'vscode';
import { LoomTreeProvider, TreeNode } from '../tree/treeProvider';
import { TokenEstimatorService } from '../services/tokenEstimatorService';
import { getMCP } from '../mcp-client';

// ---------------------------------------------------------------------------
// Bundle shape (mirrors packages/core ContextBundle — the sidebar reads the
// structured form via loom://context/{target}?mode=&format=json). The panel is
// a pure consumer of this bundle: what it shows == what the AI receives, by
// construction, because the same pipeline + the same .loom/context-prefs.json
// drive both (design §1 B / §6 A).
// ---------------------------------------------------------------------------

type EmitReason = 'auto' | 'requires_load' | 'user-include' | 'user-exclude-overridden';
type ExcludeReason = 'user-exclude' | 'load_when-filter' | 'stale-skip' | 'budget' | 'missing';

interface BundledDoc {
    id: string;
    title: string;
    type: string;
    scope: string;
    reason: EmitReason;
    tokenEstimate: number;
    stale?: { reason: string };
    missing?: true;
    alwaysLocked?: boolean;
    requiredBy?: string;
}
interface ExcludedDoc { id: string; reason: ExcludeReason; }
interface ContextBundle {
    targetId: string;
    mode: string;
    docs: BundledDoc[];
    excluded: ExcludedDoc[];
    totalTokens: number;
}

// Mode a target launches in (drives load_when filtering). Mirrors the pipeline's
// command→mode mapping for the doc types the tree can focus.
const MODE_BY_TYPE: Record<string, string> = {
    chat: 'chat',
    idea: 'idea',
    design: 'design',
    plan: 'implementing',
    ctx: 'ctx',
    reference: 'chat',
    done: 'chat',
};

/** A render state for one CONTEXT row, derived from the bundle. */
type RowState = 'auto' | 'locked' | 'pinned' | 'excluded' | 'available' | 'missing' | 'required';

interface DocRow {
    id: string;
    title: string;
    type: string;
    state: RowState;
    tokens: number;
    staleReason?: string;
    requiredBy?: string;
}

type SectionItem =
    | { kind: 'section'; label: string }
    | { kind: 'doc'; row: DocRow }
    | { kind: 'total'; label: string }
    | { kind: 'empty'; label: string };

const ICON: Record<RowState, { id: string; color?: string }> = {
    auto: { id: 'check', color: 'charts.green' },
    locked: { id: 'lock' },
    pinned: { id: 'pinned', color: 'charts.blue' },
    excluded: { id: 'circle-slash', color: 'charts.red' },
    available: { id: 'circle-outline' },
    missing: { id: 'error', color: 'charts.red' },
    required: { id: 'check', color: 'charts.yellow' },
};

const CONTEXT_VALUE: Record<RowState, string> = {
    auto: 'ctx-auto',
    locked: 'ctx-locked',
    pinned: 'ctx-pinned',
    excluded: 'ctx-excluded',
    available: 'ctx-available',
    missing: 'ctx-missing',
    required: 'ctx-required',
};

export class ContextSidebarProvider implements vscode.TreeDataProvider<SectionItem> {
    private _onDidChangeTreeData = new vscode.EventEmitter<SectionItem | undefined | void>();
    readonly onDidChangeTreeData = this._onDidChangeTreeData.event;

    private bundle: ContextBundle | null = null;
    private targetId: string | null = null;
    private mode: string | null = null;
    private targetUri: string | null = null;
    private loading = false;

    constructor(
        private treeProvider: LoomTreeProvider,
        private estimator: TokenEstimatorService,
    ) {}

    refresh(): void {
        this._onDidChangeTreeData.fire();
    }

    // ── selection → target → bundle ────────────────────────────────────────────

    /** Resolve the focused tree node to a context target (doc-form or thread-form). */
    private resolveTarget(node: TreeNode | undefined): { uri: string; targetId: string; mode: string } | null {
        if (!node) return null;
        if (node.doc) {
            const mode = MODE_BY_TYPE[node.doc.type] ?? 'chat';
            return {
                uri: `loom://context/${node.doc.id}?mode=${mode}&format=json`,
                targetId: node.doc.id,
                mode,
            };
        }
        if (node.weaveId && node.threadId) {
            // Thread node → anchor on the thread's primary doc (resolved server-side).
            return {
                uri: `loom://context/thread/${node.weaveId}/${node.threadId}?mode=chat&format=json`,
                targetId: `${node.weaveId}/${node.threadId}`,
                mode: 'chat',
            };
        }
        return null;
    }

    async onSelectionChanged(node: TreeNode | undefined): Promise<void> {
        const target = this.resolveTarget(node);
        if (!target) {
            this.bundle = null;
            this.targetId = null;
            this.mode = null;
            this.targetUri = null;
            this.refresh();
            return;
        }
        this.mode = target.mode;
        this.targetUri = target.uri;
        await this.reload(target.uri);
    }

    /** Re-read the bundle for the current target and re-render (design §6: always re-run). */
    private async reload(uri: string): Promise<void> {
        const root = this.treeProvider.getLoomRoot();
        if (!root) { this.bundle = null; this.refresh(); return; }
        this.loading = true;
        this.refresh();
        try {
            const text = await getMCP(root).readResource(uri);
            const bundle = JSON.parse(text) as ContextBundle;
            this.bundle = bundle;
            this.targetId = bundle.targetId; // canonical id the prefs are keyed under
        } catch {
            this.bundle = null;
            this.targetId = null;
        } finally {
            this.loading = false;
            this.refresh();
        }
    }

    // ── toggle actions (persisted via loom_set_context_prefs, design §4 B) ──────

    private async currentPrefs(root: string): Promise<{ include: string[]; exclude: string[] }> {
        if (!this.targetId) return { include: [], exclude: [] };
        try {
            // callTool returns the already-parsed { docUlid, entry } object (see mcp-client.ts).
            const res = await getMCP(root).callTool('loom_get_context_prefs', { doc_ulid: this.targetId }) as any;
            return { include: res?.entry?.include ?? [], exclude: res?.entry?.exclude ?? [] };
        } catch {
            return { include: [], exclude: [] };
        }
    }

    private async applyPrefs(include: string[], exclude: string[]): Promise<void> {
        const root = this.treeProvider.getLoomRoot();
        if (!root || !this.targetId) return;
        try {
            await getMCP(root).callTool('loom_set_context_prefs', { doc_ulid: this.targetId, include, exclude });
        } catch (e: any) {
            vscode.window.showErrorMessage(`Loom: failed to save context override — ${e?.message ?? e}`);
            return;
        }
        if (this.targetUri) await this.reload(this.targetUri);
    }

    private without(xs: string[], id: string): string[] { return xs.filter(x => x !== id); }
    private withId(xs: string[], id: string): string[] { return Array.from(new Set([...xs, id])); }

    /** Force-exclude a doc. Warns first when the doc is a 🔒 `load: always` ref (design §5). */
    async exclude(id: string): Promise<void> {
        const root = this.treeProvider.getLoomRoot();
        if (!root) return;
        const row = this.findRow(id);
        if (row?.state === 'locked') {
            const choice = await vscode.window.showWarningMessage(
                `Force-exclude "${row.title}"? It is marked load: always and normally loads for every ${this.mode ?? 'action'}.`,
                { modal: true },
                'Exclude anyway',
            );
            if (choice !== 'Exclude anyway') return;
        }
        const prefs = await this.currentPrefs(root);
        await this.applyPrefs(this.without(prefs.include, id), this.withId(prefs.exclude, id));
    }

    /** Force-include a doc (un-exclude, or pull in an auto-excluded/available ref). */
    async include(id: string): Promise<void> {
        const root = this.treeProvider.getLoomRoot();
        if (!root) return;
        const prefs = await this.currentPrefs(root);
        await this.applyPrefs(this.withId(prefs.include, id), this.without(prefs.exclude, id));
    }

    /** Reset a doc to its automatic state (drop any user include/exclude for it). */
    async reset(id: string): Promise<void> {
        const root = this.treeProvider.getLoomRoot();
        if (!root) return;
        const prefs = await this.currentPrefs(root);
        await this.applyPrefs(this.without(prefs.include, id), this.without(prefs.exclude, id));
    }

    /** Open the underlying doc/ref for a context row in the editor. */
    async openDoc(id: string): Promise<void> {
        const root = this.treeProvider.getLoomRoot();
        if (!root) return;
        try {
            // callTool already unwraps + JSON-parses the tool's text content (see mcp-client.ts),
            // so the result is the parsed { id, filePath } object — not the raw MCP envelope.
            const res: any = await getMCP(root).callTool('loom_find_doc', { id });
            const filePath = res?.filePath;
            if (!filePath) throw new Error('no file path resolved');
            const doc = await vscode.workspace.openTextDocument(filePath);
            await vscode.window.showTextDocument(doc, { preview: false });
        } catch (err: any) {
            vscode.window.showWarningMessage(`Couldn't open ${id}: ${err?.message ?? err}`);
        }
    }

    // ── bundle → rows ───────────────────────────────────────────────────────────

    private rows(): DocRow[] {
        if (!this.bundle) return [];
        const rows: DocRow[] = [];
        const seen = new Set<string>();

        for (const d of this.bundle.docs) {
            seen.add(d.id);
            let state: RowState;
            if (d.missing) state = 'missing';
            else if (d.requiredBy) state = 'required'; // ⊘ — pulled in despite an exclude/filter
            else if (d.reason === 'user-include') state = 'pinned';
            else if (d.alwaysLocked) state = 'locked';
            else state = 'auto';
            rows.push({
                id: d.id, title: d.title, type: d.type, state,
                tokens: d.tokenEstimate, staleReason: d.stale?.reason, requiredBy: d.requiredBy,
            });
        }

        for (const e of this.bundle.excluded) {
            if (seen.has(e.id)) continue; // missing placeholders already rendered from docs[]
            seen.add(e.id);
            if (e.reason === 'user-exclude') {
                rows.push({ id: e.id, title: e.id, type: '', state: 'excluded', tokens: 0 });
            } else if (e.reason === 'load_when-filter') {
                rows.push({ id: e.id, title: e.id, type: 'reference', state: 'available', tokens: 0 });
            } else if (e.reason === 'missing') {
                rows.push({ id: e.id, title: e.id, type: '', state: 'missing', tokens: 0 });
            }
        }
        return rows;
    }

    private findRow(id: string): DocRow | undefined {
        return this.rows().find(r => r.id === id);
    }

    // ── TreeDataProvider ─────────────────────────────────────────────────────────

    getTreeItem(item: SectionItem): vscode.TreeItem {
        if (item.kind === 'section') {
            const node = new vscode.TreeItem(item.label, vscode.TreeItemCollapsibleState.None);
            node.contextValue = 'section';
            return node;
        }
        if (item.kind === 'empty') {
            const node = new vscode.TreeItem(item.label, vscode.TreeItemCollapsibleState.None);
            node.contextValue = 'empty';
            return node;
        }
        if (item.kind === 'total') {
            const node = new vscode.TreeItem(item.label, vscode.TreeItemCollapsibleState.None);
            node.contextValue = 'total';
            node.iconPath = new vscode.ThemeIcon('dashboard');
            return node;
        }

        const { row } = item;
        const loaded = row.state !== 'excluded' && row.state !== 'available' && row.state !== 'missing';
        const tokenStr = loaded && row.tokens > 0 ? this.estimator.format(row.tokens) : '';
        const stale = row.staleReason ? '  ⚠' : '';

        const node = new vscode.TreeItem(row.title, vscode.TreeItemCollapsibleState.None);
        node.description = `${row.type}${stale}  ${tokenStr}`.trim();
        node.tooltip = this.tooltip(row);
        node.contextValue = CONTEXT_VALUE[row.state];
        const icon = ICON[row.state];
        node.iconPath = icon.color
            ? new vscode.ThemeIcon(icon.id, new vscode.ThemeColor(icon.color))
            : new vscode.ThemeIcon(icon.id);
        node.command = { command: 'loom.context.openDoc', title: 'Open', arguments: [row.id] };
        return node;
    }

    private tooltip(row: DocRow): string {
        const lines: string[] = [`${row.title}${row.type ? ` (${row.type})` : ''}`];
        const label: Record<RowState, string> = {
            auto: 'auto-included',
            locked: 'always-loaded (load: always) — can force-exclude',
            pinned: 'force-included by you',
            excluded: 'excluded by you — click ✓ to restore',
            available: 'filtered out by load_when — click to force-include',
            missing: 'requires_load target does not exist',
            required: row.requiredBy
                ? `⊘ you excluded this, but ${row.requiredBy} requires it — included anyway`
                : '⊘ required by another doc — included despite exclude',
        };
        lines.push(label[row.state]);
        if (row.staleReason) lines.push(`⚠ stale: ${row.staleReason}`);
        if (row.tokens > 0) lines.push(`${this.estimator.format(row.tokens)} tokens`);
        return lines.join('\n');
    }

    getChildren(element?: SectionItem): SectionItem[] {
        if (element) return [];

        if (!this.bundle) {
            return [{ kind: 'empty', label: this.loading ? 'Loading context…' : 'Select a chat, plan, or design to see context' }];
        }

        const rows = this.rows();
        if (rows.length === 0) {
            return [{ kind: 'empty', label: 'No context for this target' }];
        }

        const items: SectionItem[] = [];
        const included = rows.filter(r => r.state !== 'excluded' && r.state !== 'available');
        const aside = rows.filter(r => r.state === 'excluded' || r.state === 'available');

        items.push({ kind: 'section', label: `Context  ${this.estimator.format(this.bundle.totalTokens)}` });
        for (const row of included) items.push({ kind: 'doc', row });

        if (aside.length > 0) {
            items.push({ kind: 'section', label: 'Excluded / available' });
            for (const row of aside) items.push({ kind: 'doc', row });
        }

        items.push({ kind: 'total', label: `Total: ${this.estimator.format(this.bundle.totalTokens)}` });
        return items;
    }
}
