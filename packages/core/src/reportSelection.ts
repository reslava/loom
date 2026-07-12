import { LoomState } from './entities/state';
import { ReportKind } from './reportKinds';

/**
 * Deterministic doc-selection for reports — the pure keystone of the report feature.
 *
 * A pure function over `LoomState` (mirrors `buildRoadmap`): given a report kind and a
 * scope filter, it gathers the docs whose `type ∈ kind.docTypes` within the filter,
 * orders them deterministically, and returns them plus a coverage `manifest`. No IO, no
 * AI — the MCP `report` prompt calls `getState` then this, so it is unit-testable with a
 * state fixture. (Roadmap-sourced kinds like `project-overview` carry an empty
 * `docTypes` and bypass this — the prompt reads `loom://roadmap` for them.)
 *
 * Slice-C scope: select-all-within-filters + chronological order + a size-reporting
 * manifest. A token budget that prefers ctx/summaries over full bodies when oversized is
 * a deliberate later refinement — filters (--weave/--thread/--since/--until) are the
 * scope control for now, and `manifest.totalChars` makes the size visible.
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

export interface ReportDocSlice {
    id: string;
    type: string;
    title: string;
    weaveSlug: string | null;
    threadSlug: string | null;
    created: string;
    body: string;
}

export interface ReportManifest {
    kind: string;
    docTypes: string[];
    filters: ReportFilters;
    /** Count of selected docs by type. */
    counts: Record<string, number>;
    totalDocs: number;
    totalChars: number;
}

export interface ReportSelection {
    docs: ReportDocSlice[];
    manifest: ReportManifest;
}

export function selectReportDocs(
    state: LoomState,
    kind: ReportKind,
    filters: ReportFilters = {},
): ReportSelection {
    const wantTypes = new Set(kind.docTypes);
    const weaveFilter = filters.weaves && filters.weaves.length ? new Set(filters.weaves) : null;
    const threadFilter = filters.threads && filters.threads.length ? new Set(filters.threads) : null;
    const from = filters.from ?? null;
    const to = filters.to ?? null;

    const seen = new Set<string>();
    const collected: ReportDocSlice[] = [];

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
            body: typeof doc.content === 'string' ? doc.content : '',
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

    // Deterministic order: chronological by `created` (asc), tie-broken by id. A
    // structural ordering for kinds like `architecture` is a later refinement.
    collected.sort((a, b) =>
        a.created < b.created ? -1 : a.created > b.created ? 1 : a.id < b.id ? -1 : a.id > b.id ? 1 : 0,
    );

    const counts: Record<string, number> = {};
    let totalChars = 0;
    for (const d of collected) {
        counts[d.type] = (counts[d.type] ?? 0) + 1;
        totalChars += d.body.length;
    }

    return {
        docs: collected,
        manifest: {
            kind: kind.slug,
            docTypes: kind.docTypes,
            filters,
            counts,
            totalDocs: collected.length,
            totalChars,
        },
    };
}
