import {
    LoomState,
    Document,
    PlanDoc,
    DesignDoc,
    ReqDoc,
    ReferenceDoc,
    ContextBundle,
    BundledDoc,
    ExcludedDoc,
    ContextOverrides,
    LoadedDoc,
    ManifestEntry,
    OperationMode,
    DocScope,
    isPlanStale,
    isReqStale,
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
 * Does a reference doc's `load_when` allow the given effective mode?
 * Absent or empty `load_when` ⇒ relevant to all modes.
 */
function loadWhenAllows(doc: ReferenceDoc, effectiveMode: string): boolean {
    const lw = doc.load_when;
    if (!lw || lw.length === 0) return true;
    return lw.includes(effectiveMode);
}

/**
 * Assemble the deterministic context bundle for a target document.
 *
 * Pure: no IO, no async, no side effects. Everything is read from `state`
 * (bodies via BaseDoc.content, id/slug lookups via state.index).
 *
 * Scope: auto-load global + weave ctx (all ctx treated as load:always; thread
 * scope has no ctx — a thread's idea/design/plan load in full via the parent chain)
 * + load:always reference docs in matching scope, filtered by `load_when` vs
 * the effective mode (Phase 2) + the target's parent chain + eager/transitive
 * requires_load. by-request refs are excluded from auto-load but remain
 * reachable via requires_load. No token budget yet (Phase 5). The `overrides`
 * argument is honoured (exclude wins, include adds) — the sidebar UX that
 * *produces* overrides is Phase 3.
 *
 * Context Dispatcher (model C): `alreadyLoaded` is the caller-declared ledger of
 * `{id, version}` it currently holds. After the full bundle is resolved, any doc
 * whose `{id@version}` matches the ledger is suppressed from `docs` (the delta)
 * and recorded in `manifest` (assumed-present) instead. The dedupe unit is
 * `{id@version}`: a version bump (refine) no longer matches, so the fresh doc is
 * always re-emitted — no silent under-load. An empty/absent ledger yields the
 * full bundle and an empty manifest. Still pure: no IO, no side effects.
 */
export function assembleContext(
    targetId: string,
    mode: OperationMode,
    overrides: ContextOverrides,
    state: LoomState,
    alreadyLoaded: LoadedDoc[] = [],
): ContextBundle {
    const catalog = buildCatalog(state);

    const canonicalTargetId = resolveId(state.index, targetId) ?? targetId;
    const targetEntry = catalog.get(canonicalTargetId);
    if (!targetEntry) {
        throw new Error(`Context target not found in loom state: ${targetId}`);
    }

    // `refine` is compound — load_when filtering applies per the *target's* type, not
    // the literal mode string (design §8). Every other mode filters against itself.
    const effectiveMode: string = mode === 'refine' ? targetEntry.doc.type : mode;

    const emitted = new Map<string, BundledDoc>();
    const order: string[] = [];
    const excluded: ExcludedDoc[] = [];
    const excludeSet = new Set(overrides.exclude.map(id => resolveId(state.index, id) ?? id));

    const add = (
        doc: Document,
        scope: DocScope,
        reason: BundledDoc['reason'],
        requiredBy?: string,
    ): boolean => {
        if (emitted.has(doc.id)) return false;
        const isExcluded = excludeSet.has(doc.id);
        // A user exclude is overridden by an explicit user-include OR by a
        // requires_load need (design §5: requires_load wins — a doc another doc
        // genuinely needs is never starved by an exclude). Every other reason
        // respects the exclude.
        if (isExcluded && reason !== 'user-include' && reason !== 'requires_load') {
            if (!excluded.some(e => e.id === doc.id)) excluded.push({ id: doc.id, reason: 'user-exclude' });
            return false;
        }
        // When requires_load overrides an exclude, record it as overridden (not a
        // plain requires_load) so the sidebar can render ⊘ + "required by X".
        const wasFiltered = excluded.some(e => e.id === doc.id && e.reason === 'load_when-filter');
        const emitReason: BundledDoc['reason'] =
            isExcluded && reason === 'requires_load' ? 'user-exclude-overridden' : reason;
        const bundled: BundledDoc = {
            id: doc.id,
            title: doc.title,
            type: doc.type,
            scope,
            reason: emitReason,
            version: doc.version,
            content: doc.content,
            tokenEstimate: estimateTokens(doc.content),
        };
        // ⊘ provenance: a requires_load pull that overrode a gate (user-exclude or
        // a load_when filter) carries the requiring doc's id.
        if (requiredBy && reason === 'requires_load' && (isExcluded || wasFiltered)) {
            bundled.requiredBy = requiredBy;
        }
        const stale = staleReason(doc, targetEntry, state);
        if (stale) bundled.stale = { reason: stale };
        emitted.set(doc.id, bundled);
        order.push(doc.id);
        return true;
    };

    // Auto-load gate for reference docs (Phase 2). Only `load: always` refs are
    // auto-loaded; `by-request` (and unset) refs are skipped here but stay reachable
    // via requires_load. An always-ref whose `load_when` omits the effective mode is
    // dropped with reason 'load_when-filter' (cleared later if requires_load pulls it).
    const addReference = (doc: Document, scope: DocScope): void => {
        if (doc.type !== 'reference') return;
        if (doc.id === canonicalTargetId || emitted.has(doc.id)) return;
        if (doc.load !== 'always') return;
        if (!loadWhenAllows(doc, effectiveMode)) {
            if (!excluded.some(e => e.id === doc.id)) excluded.push({ id: doc.id, reason: 'load_when-filter' });
            return;
        }
        // Only `load: always` refs reach here, so mark the emitted doc as
        // always-locked — the sidebar renders 🔒 and warns before a force-exclude.
        if (add(doc, scope, 'auto')) {
            const bundled = emitted.get(doc.id);
            if (bundled) bundled.alwaysLocked = true;
        }
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
    // No thread-scoped ctx: a thread's idea/design/plan are loaded in full by the
    // parent chain (step 4), so a thread-ctx would duplicate context, not compress it.
    // ctx exists at global + weave scope only.

    // 2d/3. Reference docs (Phase 2): auto-load load:always refs in matching scope, filtered
    // by load_when vs the effective mode. Ordered global → weave → thread — after ctx and before
    // the parent chain, per the deterministic ordering rule.
    for (const doc of state.globalDocs) addReference(doc, 'global');
    if (weave) {
        for (const doc of [...weave.looseFibers, ...weave.refDocs]) addReference(doc, 'weave');
    }
    if (thread) {
        for (const doc of thread.allDocs) addReference(doc, 'thread');
    }

    // 4. Parent chain for a thread target. The req spec is injected FIRST — it is
    // the authoritative include/exclude/constraints the rest of the chain must
    // honour, so it frames everything after it. (This is the thread-scope
    // always-load slot; ctx is global+weave only.)
    if (thread) {
        if (thread.req && thread.req.id !== canonicalTargetId) add(thread.req, 'thread', 'auto');
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

    const resolved = order.map(id => emitted.get(id)!);

    // Context Dispatcher (model C): split the resolved bundle into the delta the
    // caller still needs and the manifest it already holds. The dedupe unit is
    // `{id@version}` — a doc is assumed-present only when BOTH its id and version
    // match the declared ledger, so a version bump (refine) always falls through
    // to the delta (no silent under-load). Ledger ids are resolved through the
    // index so a slug declaration matches its canonical id.
    const loadedSet = new Set(
        alreadyLoaded.map(l => `${resolveId(state.index, l.id) ?? l.id}@${l.version}`),
    );
    const docs: BundledDoc[] = [];
    const manifest: ManifestEntry[] = [];
    for (const d of resolved) {
        if (loadedSet.has(`${d.id}@${d.version}`)) {
            manifest.push({ id: d.id, version: d.version });
        } else {
            docs.push(d);
        }
    }
    // totalTokens reflects the delta actually injected, not the full resolved set.
    const totalTokens = docs.reduce((sum, d) => sum + d.tokenEstimate, 0);

    // An emitted doc carries no exclusion record: requires_load / user-include win over
    // both the load_when gate and a user-exclude (design §5). Drop any 'load_when-filter'
    // or 'user-exclude' entry whose id actually ended up in the bundle (no contradiction;
    // the override is surfaced on the BundledDoc as reason/requiredBy instead).
    const finalExcluded = excluded.filter(
        e => !((e.reason === 'load_when-filter' || e.reason === 'user-exclude') && emitted.has(e.id)),
    );

    return { targetId: canonicalTargetId, mode, docs, excluded: finalExcluded, totalTokens, manifest };
}

function staleReason(doc: Document, targetEntry: CatalogEntry, state: LoomState): string | null {
    const weave = state.weaves.find(w => w.id === targetEntry.weaveId);
    const thread = weave?.threads.find(t => t.id === targetEntry.threadId);
    if (!thread) return null;

    // Directional, version-based staleness (loom/refs/staleness-reference.md):
    // a child is stale when an upstream parent's version moved past its baseline.
    if (doc.type === 'design' && thread.idea) {
        const iv = (doc as DesignDoc).idea_version;
        return typeof iv === 'number' && iv < thread.idea.version
            ? `idea v${thread.idea.version} is newer than this design's idea_version`
            : null;
    }
    if (doc.type === 'req' && thread.design) {
        const dv = (doc as ReqDoc).design_version;
        return typeof dv === 'number' && dv < thread.design.version
            ? `design v${thread.design.version} is newer than this req's design_version`
            : null;
    }
    if (doc.type === 'plan') {
        if (thread.design && isPlanStale(doc as PlanDoc, thread.design as DesignDoc)) {
            return `design v${(thread.design as DesignDoc).version} is newer than this plan's design_version`;
        }
        if (thread.req && isReqStale(doc as { req_version?: number }, thread.req)) {
            return `req v${thread.req.version} is newer than this plan's req_version`;
        }
    }
    return null;
}

function resolveRequiresLoad(
    targetId: string,
    catalog: Map<string, CatalogEntry>,
    state: LoomState,
    emitted: Map<string, BundledDoc>,
    order: string[],
    excluded: ExcludedDoc[],
    add: (doc: Document, scope: DocScope, reason: BundledDoc['reason'], requiredBy?: string) => boolean,
): void {
    // Seed the queue with the requires_load of every doc emitted so far + the target,
    // tracking which doc required each ref (for ⊘ "required by X" provenance).
    const queue: { ref: string; requiredBy: string }[] = [];
    const seedFrom = (id: string) => {
        const entry = catalog.get(id);
        for (const ref of entry?.doc.requires_load ?? []) queue.push({ ref, requiredBy: id });
    };
    for (const id of [...order]) seedFrom(id);

    const visited = new Set<string>();
    while (queue.length > 0) {
        const { ref, requiredBy } = queue.shift()!;
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
                    version: 0,
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

        if (add(entry.doc, entry.scope, 'requires_load', requiredBy)) {
            for (const next of entry.doc.requires_load ?? []) queue.push({ ref: next, requiredBy: cid });
        }
    }
}
