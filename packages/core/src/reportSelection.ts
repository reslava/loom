import { LoomState } from './entities/state';
import { ReportKind, ReportSort, DEFAULT_REPORT_MAX_CHARS, DEFAULT_REPORT_SORT } from './reportKinds';

/**
 * Deterministic doc-selection for reports — the pure keystone of the report feature.
 *
 * A pure function over `LoomState` (mirrors `buildRoadmap`): given a report kind and a
 * scope filter, it gathers the docs whose `type ∈ kind.docTypes` within the filter,
 * orders them deterministically, applies a deterministic token budget, and returns them
 * plus a coverage `manifest`. No IO, no AI — the MCP `report` prompt calls `getState`
 * then this, so it is unit-testable with a state fixture. (Roadmap-sourced kinds like
 * `project-overview` carry an empty `docTypes` and bypass this — the prompt reads
 * `loom://roadmap` for them.)
 *
 * Token budget (C-2): a whole-project `decisions`/`security` report can be hundreds of KB.
 * When the full slice exceeds `maxChars`, docs degrade in tiers by relevance. The keep-full
 * ordering is selectable (`sort`): `recency` keeps the NEWEST docs full (the tail degrades),
 * `oldest` keeps the OLDEST/foundational docs full — resolved from the `sort` param →
 * `kind.defaultSort` → `DEFAULT_REPORT_SORT`. Only the RELEVANCE order used for tier
 * allocation changes; the OUTPUT stays chronological. Tiers:
 *   - **full** — full body, for the docs that fit the budget;
 *   - **summary** — a deterministic summary for the rest: an existing ctx doc for that
 *     scope if present, else a fixed excerpt (H1 + section headings + first N lines);
 *   - **reference** — a short `{id,title,type,created}` marker for the overflow.
 * Every summary is an excerpt or an existing ctx doc — never model output — so the
 * function stays pure, testable, and free. The manifest records `fullChars` (pre-budget)
 * vs `emittedChars` (post-budget) so a report can state its own coverage.
 */

export interface ReportFilters {
    /** Restrict to these weave slugs (empty/absent = all weaves). */
    weaves?: string[];
    /** Restrict to these thread slugs (empty/absent = all threads). */
    threads?: string[];
    /** Inclusive lower bound on doc `created` (YYYY-MM-DD). */
    from?: string | null;
    /** Inclusive upper bound on doc `created` (YYYY-MM-DD). */
    to?: string | null;
}

/** The tier at which a doc was emitted under the budget. */
export type ReportTier = 'full' | 'summary' | 'reference';

export interface ReportDocSlice {
    id: string;
    type: string;
    title: string;
    weaveSlug: string | null;
    threadSlug: string | null;
    created: string;
    /** How this doc was emitted under the budget: full body, deterministic summary, or marker. */
    tier: ReportTier;
    /** Emitted content for the doc's tier (full body, summary, or reference-only marker). */
    body: string;
}

export interface ReportManifest {
    kind: string;
    docTypes: string[];
    filters: ReportFilters;
    /** Count of selected docs by type. */
    counts: Record<string, number>;
    totalDocs: number;
    /** The char budget in effect for this run. */
    maxChars: number;
    /** The keep-full ordering in effect for this run (resolved param → kind default → global default). */
    sort: ReportSort;
    /** Total chars of ALL selected docs' FULL bodies, before any budget degradation. */
    fullChars: number;
    /** Total chars actually emitted after budget degradation (≈ ≤ maxChars once budgeted). */
    emittedChars: number;
    /** True when the full slice exceeded the budget and degradation was applied. */
    budgeted: boolean;
    /** Per-tier doc counts (how many docs were emitted at full / summary / reference depth). */
    tiers: { full: number; summary: number; reference: number };
    /** Human-readable coverage/elision summary, e.g. "12 full, 8 summarized, 3 referenced — 58k of 240k chars (budget 60k)." */
    elision: string;
    /** Weaves that had docs degraded by the budget but have NO ctx doc — generating a ctx
     *  for them would yield better summaries next run. Empty when nothing was degraded. */
    oversizedWeavesWithoutCtx: string[];
}

export interface ReportSelection {
    docs: ReportDocSlice[];
    manifest: ReportManifest;
}

/** Internal collected shape — carries the raw full body before budget tiering. */
interface Collected {
    id: string;
    type: string;
    title: string;
    weaveSlug: string | null;
    threadSlug: string | null;
    created: string;
    rawBody: string;
}

const GLOBAL_CTX = '__global__';

/**
 * Deterministic, AI-free summary of a doc body: its H1, its section headings, and the
 * first N content lines. Pure string work — same input always yields the same output.
 */
export function deterministicExcerpt(body: string, maxLines = 12): string {
    const lines = body.split('\n');
    const h1 = lines.find(l => /^#\s+/.test(l))?.replace(/^#\s+/, '').trim() ?? '';
    const headings = lines
        .filter(l => /^#{2,3}\s+/.test(l))
        .map(l => l.replace(/^#{2,6}\s+/, '').trim());
    const firstLines = lines
        .filter(l => l.trim().length > 0 && !/^#{1,6}\s+/.test(l))
        .slice(0, maxLines);
    const parts: string[] = ['_(summary — full body elided for budget)_'];
    if (h1) parts.push(`# ${h1}`);
    if (headings.length) parts.push(`**Sections:** ${headings.join(' · ')}`);
    if (firstLines.length) parts.push(firstLines.join('\n'));
    return parts.join('\n\n');
}

/** Short reference-only marker for a doc dropped from the budget entirely. */
function referenceMarker(d: { type: string; created: string }): string {
    return `_(reference-only — omitted for budget; ${d.type}, created ${d.created})_`;
}

/**
 * Collect ctx doc bodies keyed by scope (weave slug, or GLOBAL_CTX for project-level).
 * Used as the preferred deterministic summary for a doc when the budget forces degradation.
 */
function collectCtxByScope(state: LoomState): Map<string, string> {
    const map = new Map<string, string>();
    const put = (scope: string, doc: any): void => {
        if (doc && doc.type === 'ctx' && typeof doc.content === 'string' && !map.has(scope)) {
            map.set(scope, doc.content);
        }
    };
    for (const weave of state.weaves ?? []) {
        const pools: any[] = [
            ...(weave.allDocs ?? []),
            ...(weave.refDocs ?? []),
            ...(weave.looseFibers ?? []),
            ...(weave.chats ?? []),
        ];
        for (const thread of weave.threads ?? []) pools.push(...(thread.allDocs ?? []));
        for (const d of pools) put(weave.id, d);
    }
    for (const d of [...(state.globalDocs ?? []), ...(state.globalChats ?? [])]) put(GLOBAL_CTX, d);
    return map;
}

export function selectReportDocs(
    state: LoomState,
    kind: ReportKind,
    filters: ReportFilters = {},
    maxChars?: number,
    sort?: ReportSort,
): ReportSelection {
    // Keep-full ordering: explicit param wins, else the kind's default, else the global default.
    const effectiveSort: ReportSort = sort ?? kind.defaultSort ?? DEFAULT_REPORT_SORT;
    const wantTypes = new Set(kind.docTypes);
    const weaveFilter = filters.weaves && filters.weaves.length ? new Set(filters.weaves) : null;
    const threadFilter = filters.threads && filters.threads.length ? new Set(filters.threads) : null;
    const from = filters.from ?? null;
    const to = filters.to ?? null;

    const seen = new Set<string>();
    const collected: Collected[] = [];

    const consider = (doc: any, weaveSlug: string | null, threadSlug: string | null): void => {
        if (!doc || !doc.id || seen.has(doc.id)) return;
        if (weaveFilter && (weaveSlug === null || !weaveFilter.has(weaveSlug))) return;
        if (threadFilter && (threadSlug === null || !threadFilter.has(threadSlug))) return;
        if (!wantTypes.has(doc.type)) return;
        // Date window on `created` (inclusive), compared on the YYYY-MM-DD prefix.
        const created = typeof doc.created === 'string' ? doc.created.slice(0, 10) : '';
        if (from && created && created < from) return;
        if (to && created && created > to) return;
        seen.add(doc.id);
        collected.push({
            id: doc.id,
            type: doc.type,
            title: typeof doc.title === 'string' ? doc.title : doc.id,
            weaveSlug,
            threadSlug,
            created,
            rawBody: typeof doc.content === 'string' ? doc.content : '',
        });
    };

    for (const weave of state.weaves ?? []) {
        for (const thread of weave.threads ?? []) {
            // Walk the thread's docs from every array + allDocs, deduped by id (consider()
            // guards against double-counting), so no doc type is missed regardless of how
            // loadThread grouped them.
            const threadDocs = [
                ...(thread.allDocs ?? []),
                thread.idea, thread.design, thread.req,
                ...(thread.plans ?? []),
                ...(thread.dones ?? []),
                ...(thread.chats ?? []),
                ...(thread.refDocs ?? []),
            ];
            for (const d of threadDocs) consider(d, weave.id, thread.id);
        }
        for (const d of weave.looseFibers ?? []) consider(d, weave.id, null);
        for (const d of weave.chats ?? []) consider(d, weave.id, null);
        for (const d of weave.refDocs ?? []) consider(d, weave.id, null);
    }
    for (const d of state.globalDocs ?? []) consider(d, null, null);
    for (const d of state.globalChats ?? []) consider(d, null, null);

    // --- Deterministic token budget ---------------------------------------------------
    const budget = maxChars ?? kind.maxChars ?? DEFAULT_REPORT_MAX_CHARS;
    const fullChars = collected.reduce((n, d) => n + d.rawBody.length, 0);
    const budgeted = fullChars > budget;

    const ctxByScope = collectCtxByScope(state);
    const summaryFor = (d: Collected): string => {
        const ctx = ctxByScope.get(d.weaveSlug ?? GLOBAL_CTX);
        if (ctx && ctx.trim().length) {
            const label = d.weaveSlug ? `weave "${d.weaveSlug}"` : 'global';
            return `_(summary — ${label} ctx used in place of full body for budget)_\n\n${ctx}`;
        }
        return deterministicExcerpt(d.rawBody);
    };

    const tierById = new Map<string, { tier: ReportTier; body: string }>();
    if (!budgeted) {
        for (const d of collected) tierById.set(d.id, { tier: 'full', body: d.rawBody });
    } else {
        // Relevance order drives which docs keep full bodies: `recency` = newest first (the
        // oldest tail degrades), `oldest` = oldest first (the newest tail degrades). Tie-broken
        // by id (ascending) in both modes for stability. Greedy packing against a single char
        // budget: try full, then a deterministic summary, then a reference marker. Deterministic:
        // fixed order + fixed sizes ⇒ identical tiers on every run.
        const byRelevance = [...collected].sort((a, b) => {
            if (a.created !== b.created) {
                const aOlder = a.created < b.created;
                return effectiveSort === 'oldest' ? (aOlder ? -1 : 1) : (aOlder ? 1 : -1);
            }
            return a.id < b.id ? -1 : a.id > b.id ? 1 : 0;
        });
        let used = 0;
        for (const d of byRelevance) {
            if (used + d.rawBody.length <= budget) {
                tierById.set(d.id, { tier: 'full', body: d.rawBody });
                used += d.rawBody.length;
                continue;
            }
            const summ = summaryFor(d);
            if (used + summ.length <= budget) {
                tierById.set(d.id, { tier: 'summary', body: summ });
                used += summ.length;
                continue;
            }
            // Reference markers are the floor — every doc keeps at least this. They are
            // metadata (id/title/type/created already sit in the slice header), so they do
            // NOT consume the budget: the budget bounds full + summary content only.
            tierById.set(d.id, { tier: 'reference', body: referenceMarker(d) });
        }
    }

    // Deterministic OUTPUT order: chronological by `created` (asc), tie-broken by id — the
    // narrative order, independent of the relevance order used for budget allocation.
    collected.sort((a, b) =>
        a.created < b.created ? -1 : a.created > b.created ? 1 : a.id < b.id ? -1 : a.id > b.id ? 1 : 0,
    );

    const docs: ReportDocSlice[] = collected.map(d => {
        const t = tierById.get(d.id)!;
        return {
            id: d.id,
            type: d.type,
            title: d.title,
            weaveSlug: d.weaveSlug,
            threadSlug: d.threadSlug,
            created: d.created,
            tier: t.tier,
            body: t.body,
        };
    });

    const counts: Record<string, number> = {};
    const tiers = { full: 0, summary: 0, reference: 0 };
    let emittedChars = 0;
    for (const d of docs) {
        counts[d.type] = (counts[d.type] ?? 0) + 1;
        tiers[d.tier] += 1;
        emittedChars += d.body.length;
    }

    const elision = budgeted
        ? `${tiers.full} full, ${tiers.summary} summarized, ${tiers.reference} referenced — ${emittedChars} of ${fullChars} chars emitted (budget ${budget}).`
        : `${tiers.full} full — ${fullChars} chars, within budget ${budget} (no degradation).`;

    // Weaves whose docs got degraded but that have no ctx to summarize with — a ctx there
    // would improve future runs. Capability hint only; we never auto-generate one.
    const oversizedWeavesWithoutCtx: string[] = [];
    if (budgeted) {
        const degradedWeaves = new Set<string>();
        for (const d of docs) if (d.tier !== 'full' && d.weaveSlug) degradedWeaves.add(d.weaveSlug);
        for (const w of Array.from(degradedWeaves).sort()) if (!ctxByScope.has(w)) oversizedWeavesWithoutCtx.push(w);
    }

    return {
        docs,
        manifest: {
            kind: kind.slug,
            docTypes: kind.docTypes,
            filters,
            counts,
            totalDocs: docs.length,
            maxChars: budget,
            sort: effectiveSort,
            fullChars,
            emittedChars,
            budgeted,
            tiers,
            elision,
            oversizedWeavesWithoutCtx,
        },
    };
}
