import {
    LoomState,
    Document,
    PlanDoc,
    DesignDoc,
    ContextBundle,
    BundledDoc,
    ExcludedDoc,
    ContextOverrides,
    OperationMode,
    DocScope,
    isPlanStale,
    resolveId,
} from '../../../core/dist';

// ---------------------------------------------------------------------------
// Catalog — a single pure traversal of LoomState giving id → (doc + home scope)
// ---------------------------------------------------------------------------

interface CatalogEntry {
    doc: Document;
    scope: Exclude<DocScope, 'target'>;
    weaveId?: string;
    threadId?: string;
}

function buildCatalog(state: LoomState): Map<string, CatalogEntry> {
    const catalog = new Map<string, CatalogEntry>();

    for (const doc of state.globalDocs) {
        catalog.set(doc.id, { doc, scope: 'global' });
    }
    for (const chat of state.globalChats) {
        if (!catalog.has(chat.id)) catalog.set(chat.id, { doc: chat as Document, scope: 'global' });
    }

    for (const weave of state.weaves) {
        for (const doc of weave.looseFibers) {
            catalog.set(doc.id, { doc, scope: 'weave', weaveId: weave.id });
        }
        for (const doc of weave.refDocs) {
            catalog.set(doc.id, { doc, scope: 'weave', weaveId: weave.id });
        }
        for (const chat of weave.chats) {
            catalog.set(chat.id, { doc: chat as Document, scope: 'weave', weaveId: weave.id });
        }
        for (const thread of weave.threads) {
            for (const doc of thread.allDocs) {
                catalog.set(doc.id, { doc, scope: 'thread', weaveId: weave.id, threadId: thread.id });
            }
        }
    }

    return catalog;
}

/**
 * Pure helper: derive a document's home scope from its position in LoomState.
 * Scope is positional in Loom — there is no `scope:` frontmatter field.
 * Returns null when the id is not present in the loaded state.
 */
export function classifyScope(docId: string, state: LoomState): DocScope | null {
    return buildCatalog(state).get(docId)?.scope ?? null;
}

// ---------------------------------------------------------------------------
// Assembler
// ---------------------------------------------------------------------------

const TOKENS_PER_CHAR = 1 / 4;

function estimateTokens(content: string): number {
    return Math.ceil(content.length * TOKENS_PER_CHAR);
}

function activePlan(plans: PlanDoc[]): PlanDoc | undefined {
    return (
        plans.find(p => p.status === 'implementing') ??
        plans.find(p => p.status === 'active') ??
        plans[0]
    );
}

/**
 * Assemble the deterministic context bundle for a target document.
 *
 * Pure: no IO, no async, no side effects. Everything is read from `state`
 * (bodies via BaseDoc.content, id/slug lookups via state.index).
 *
 * Phase 1 scope: auto-load global/weave/thread ctx (all ctx treated as
 * load:always) + the target's parent chain + eager/transitive requires_load.
 * No load_when filter (Phase 2), no token budget (Phase 5). The `overrides`
 * argument is honoured (exclude wins, include adds) — the sidebar UX that
 * *produces* overrides is Phase 3.
 */
export function assembleContext(
    targetId: string,
    mode: OperationMode,
    overrides: ContextOverrides,
    state: LoomState,
): ContextBundle {
    const catalog = buildCatalog(state);

    const canonicalTargetId = resolveId(state.index, targetId) ?? targetId;
    const targetEntry = catalog.get(canonicalTargetId);
    if (!targetEntry) {
        throw new Error(`Context target not found in loom state: ${targetId}`);
    }

    const emitted = new Map<string, BundledDoc>();
    const order: string[] = [];
    const excluded: ExcludedDoc[] = [];
    const excludeSet = new Set(overrides.exclude.map(id => resolveId(state.index, id) ?? id));

    const add = (doc: Document, scope: DocScope, reason: BundledDoc['reason']): boolean => {
        if (emitted.has(doc.id)) return false;
        if (excludeSet.has(doc.id) && reason !== 'user-include') {
            if (!excluded.some(e => e.id === doc.id)) excluded.push({ id: doc.id, reason: 'user-exclude' });
            return false;
        }
        const bundled: BundledDoc = {
            id: doc.id,
            title: doc.title,
            type: doc.type,
            scope,
            reason,
            content: doc.content,
            tokenEstimate: estimateTokens(doc.content),
        };
        const stale = staleReason(doc, targetEntry, state);
        if (stale) bundled.stale = { reason: stale };
        emitted.set(doc.id, bundled);
        order.push(doc.id);
        return true;
    };

    const { weaveId, threadId } = targetEntry;
    const weave = weaveId ? state.weaves.find(w => w.id === weaveId) : undefined;
    const thread = weave && threadId ? weave.threads.find(t => t.id === threadId) : undefined;

    // 2a. Global ctx
    for (const doc of state.globalDocs) {
        if (doc.type === 'ctx' && doc.id !== canonicalTargetId) add(doc, 'global', 'auto');
    }
    // 2b. Weave ctx (loose fibers / weave-level docs of type ctx)
    if (weave) {
        for (const doc of [...weave.looseFibers, ...weave.refDocs]) {
            if (doc.type === 'ctx' && doc.id !== canonicalTargetId) add(doc, 'weave', 'auto');
        }
    }
    // 2c. Thread ctx (forward-compatible — present once getState loads thread ctx docs)
    if (thread) {
        for (const doc of thread.allDocs) {
            if (doc.type === 'ctx' && doc.id !== canonicalTargetId) add(doc, 'thread', 'auto');
        }
    }

    // 4. Parent chain (idea → design → active plan) for a thread target.
    if (thread) {
        if (thread.idea && thread.idea.id !== canonicalTargetId) add(thread.idea, 'thread', 'auto');
        if (thread.design && thread.design.id !== canonicalTargetId) add(thread.design, 'thread', 'auto');
        const plan = activePlan(thread.plans);
        if (plan && plan.id !== canonicalTargetId) add(plan, 'thread', 'auto');
    }

    // 5. User includes (overrides that add docs).
    for (const includeId of overrides.include) {
        const cid = resolveId(state.index, includeId) ?? includeId;
        const entry = catalog.get(cid);
        if (entry && !emitted.has(cid)) add(entry.doc, entry.scope, 'user-include');
    }

    // 1/6. Target doc itself, then eager + transitive requires_load.
    add(targetEntry.doc, 'target', 'auto');
    resolveRequiresLoad(canonicalTargetId, catalog, state, emitted, order, excluded, add);

    const docs = order.map(id => emitted.get(id)!);
    const totalTokens = docs.reduce((sum, d) => sum + d.tokenEstimate, 0);

    return { targetId: canonicalTargetId, mode, docs, excluded, totalTokens };
}

function staleReason(doc: Document, targetEntry: CatalogEntry, state: LoomState): string | null {
    if (doc.type !== 'plan') return null;
    const weave = state.weaves.find(w => w.id === targetEntry.weaveId);
    const thread = weave?.threads.find(t => t.id === targetEntry.threadId);
    if (!thread?.design) return null;
    return isPlanStale(doc as PlanDoc, thread.design as DesignDoc)
        ? `design v${(thread.design as DesignDoc).version} is newer than this plan's design_version`
        : null;
}

function resolveRequiresLoad(
    targetId: string,
    catalog: Map<string, CatalogEntry>,
    state: LoomState,
    emitted: Map<string, BundledDoc>,
    order: string[],
    excluded: ExcludedDoc[],
    add: (doc: Document, scope: DocScope, reason: BundledDoc['reason']) => boolean,
): void {
    // Seed the queue with the requires_load of every doc emitted so far + the target.
    const queue: string[] = [];
    const seedFrom = (id: string) => {
        const entry = catalog.get(id);
        for (const ref of entry?.doc.requires_load ?? []) queue.push(ref);
    };
    for (const id of [...order]) seedFrom(id);

    const visited = new Set<string>();
    while (queue.length > 0) {
        const ref = queue.shift()!;
        if (visited.has(ref)) continue;
        visited.add(ref);

        const cid = resolveId(state.index, ref) ?? ref;
        if (emitted.has(cid)) continue;

        const entry = catalog.get(cid);
        if (!entry) {
            // Missing target → visible placeholder + diagnostic (no silent skip).
            if (!emitted.has(ref)) {
                const placeholder: BundledDoc = {
                    id: ref,
                    title: ref,
                    type: 'reference',
                    scope: 'target',
                    reason: 'requires_load',
                    content: '',
                    tokenEstimate: 0,
                    missing: true,
                };
                emitted.set(ref, placeholder);
                order.push(ref);
            }
            if (!excluded.some(e => e.id === ref)) excluded.push({ id: ref, reason: 'missing' });
            continue;
        }

        if (add(entry.doc, entry.scope, 'requires_load')) {
            for (const next of entry.doc.requires_load ?? []) queue.push(next);
        }
    }
}
