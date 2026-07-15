import { LoomState } from './entities/state';
import { Thread } from './entities/thread';
import { ReportFilters } from './reportSelection';
import { buildRoadmap, staleEntries, RoadmapNode } from './derived';
import { isStepBlocked } from './planUtils';
import { today, toEpoch, toCanonical } from './dates';

/**
 * Forward signal — the pure Tier-1 keystone of the prospective `next-work` report.
 *
 * Where `selectReportDocs` (retrospective kinds) scans a doc-type set, this builder mines
 * the graph's *open* material and returns a ranked list of grounded next-work items. It is
 * a pure `(LoomState, ReportFilters) => ForwardSignal` function (a sibling of `buildRoadmap`
 * / `buildReleaseNotesBrief`) — no IO, no AI. The model never *finds* the signal here; it
 * only narrates + ranks what these deterministic detectors surface, so v1 stays cheap and
 * fully grounded (every item cites the doc id + detector it derives from).
 *
 * Four signal groups, all composed from derivations that already exist:
 *   - **parked-decision** — a fixed `## Open questions` / deferred heading section lifted
 *     verbatim from an idea/design body (Tier-1: it extracts an existing section, judges
 *     nothing — the semantic reading of prose is Tier-2, deferred).
 *   - **stalled-intent** — graph shape: idea→no design, design→no plan, or a plan that
 *     exists but was never started (intent that lost momentum).
 *   - **blocked-work** — blocked plan steps (`isStepBlocked`) + dependency-blocked threads
 *     (`buildRoadmap` `blockedOn`).
 *   - **drift-debt** — actionable stale docs (`staleEntries`) never reconciled.
 *
 * Ranking inputs are computed here, deterministically; the report orders its narrative from
 * them (it does not invent scores). `leverage` is a fan-out proxy (dependents / dependent
 * steps / downstream docs a resolution unblocks — see D4), `ready` is "actionable now" vs
 * itself waiting on a blocker, `ageDays` is how long the source doc has sat. The default
 * order is leverage desc, then ready-first, then oldest — "highest-leverage, unblocked,
 * longest-parked work first." (A literal leverage×readiness multiply would sink every
 * high-leverage *blocked* item to the bottom, which is the opposite of useful — so
 * readiness is a secondary key, not a multiplier.)
 */

export type ForwardSignalGroup =
    | 'parked-decision'
    | 'stalled-intent'
    | 'blocked-work'
    | 'drift-debt';

export interface ForwardSignalItem {
    group: ForwardSignalGroup;
    /** The doc this signal derives from (idea/design/plan/req) — the primary citation. */
    docId: string;
    docType: string;
    weaveSlug: string;
    threadSlug: string;
    title: string;
    /** What the open material is + which detector fired — the "why now", human-readable. */
    detail: string;
    /** Fan-out proxy: dependents / dependent steps / downstream docs a resolution unblocks. */
    leverage: number;
    /** Actionable now (parked/stalled/drift) vs itself gated on a blocker (blocked-work). */
    ready: boolean;
    /** Days the source doc has sat (created→now). Tie-breaks the ranking; oldest first. */
    ageDays: number;
    /** Extra cited ids (a blocking step, dependent threads, the plan a step lives in). */
    refs?: string[];
}

export interface ForwardSignal {
    /** All items, already ranked (leverage desc, ready-first, oldest, id — deterministic). */
    items: ForwardSignalItem[];
    /** Per-group counts (every group key present, zero when none). */
    counts: Record<ForwardSignalGroup, number>;
    totalItems: number;
    filters: ReportFilters;
    /** True when no open material survives the filters — the empty-set stop signal. */
    isEmpty: boolean;
}

/**
 * Lift a parked-decision section from a doc body: the first `## Open questions` / `deferred`
 * / `parked` heading (levels 2–4) and the lines under it up to the next same-or-higher
 * heading. Pure string work — a verbatim extract, no judgement (keeps it Tier-1). Returns
 * null when no such section exists or it is empty.
 */
export function extractParkedSection(body: string): string | null {
    const lines = body.split('\n');
    const headRe = /^(#{2,4})\s+.*\b(open questions|deferred|parked)\b/i;
    let start = -1;
    let level = 0;
    for (let i = 0; i < lines.length; i++) {
        const m = lines[i].match(headRe);
        if (m) { start = i; level = m[1].length; break; }
    }
    if (start === -1) return null;
    const body_: string[] = [];
    for (let i = start + 1; i < lines.length; i++) {
        const h = lines[i].match(/^(#{1,6})\s+/);
        if (h && h[1].length <= level) break;
        body_.push(lines[i]);
    }
    const text = body_.join('\n').trim();
    return text.length > 0 ? text : null;
}

/**
 * Inclusive `created` date window (YYYY-MM-DD prefix compare), matching selectReportDocs.
 * `created` may load as a Date (gray-matter) — canonicalize first so the compare is safe;
 * an unknown/empty date is not filtered out (the lenient selectReportDocs behaviour).
 */
function inDateWindow(created: string, from: string | null, to: string | null): boolean {
    const c = (toCanonical(created) ?? '').slice(0, 10);
    if (!c) return true;
    if (from && c < from) return false;
    if (to && c > to) return false;
    return true;
}

/** Whole-days between a doc's created date and `now` (floored, never negative). */
function ageInDays(created: string, nowEpoch: number): number {
    if (!created) return 0;
    const e = toEpoch(created);
    if (!Number.isFinite(e)) return 0;
    return Math.max(0, Math.floor((nowEpoch - e) / 86_400_000));
}

/** A thread is finished work — never a source of next-work signal. */
function isThreadDone(thread: Thread): boolean {
    const deliverables = (thread.allDocs ?? []).filter(
        d => d.type !== 'ctx' && d.type !== 'reference' && d.type !== 'req' && d.type !== 'thread',
    );
    return deliverables.length > 0 && deliverables.every(d => d.status === 'done');
}

export function buildForwardSignal(
    state: LoomState,
    filters: ReportFilters = {},
    now: string = today(),
): ForwardSignal {
    const weaveFilter = filters.weaves && filters.weaves.length ? new Set(filters.weaves) : null;
    const threadFilter = filters.threads && filters.threads.length ? new Set(filters.threads) : null;
    const from = filters.from ?? null;
    const to = filters.to ?? null;
    const nowEpoch = toEpoch(now);

    // Dependents map (roadmap fan-out): th_ ULID → how many threads depend on it. The
    // leverage proxy for stalled/blocked threads — resolving one releases its dependents.
    const roadmap = buildRoadmap(state);
    const dependents = new Map<string, number>();
    for (const node of roadmap.roadmap) {
        for (const dep of node.dependsOn) dependents.set(dep, (dependents.get(dep) ?? 0) + 1);
    }
    const nodeByThread = new Map<string, RoadmapNode>();
    for (const node of roadmap.roadmap) nodeByThread.set(`${node.weaveSlug}/${node.threadSlug}`, node);

    const items: ForwardSignalItem[] = [];
    const passesScope = (weaveSlug: string, threadSlug: string, created: string): boolean =>
        (!weaveFilter || weaveFilter.has(weaveSlug)) &&
        (!threadFilter || threadFilter.has(threadSlug)) &&
        inDateWindow(created, from, to);

    for (const weave of state.weaves ?? []) {
        for (const thread of weave.threads ?? []) {
            if (isThreadDone(thread)) continue;
            const { idea, design, req, plans } = thread;
            const node = nodeByThread.get(`${weave.id}/${thread.id}`);
            const threadDependents = node?.ulid ? (dependents.get(node.ulid) ?? 0) : 0;
            const downstreamDocs = (design ? 1 : 0) + (req ? 1 : 0) + (plans?.length ?? 0);

            // --- parked-decision: an Open-questions section on the idea/design -----------
            for (const doc of [idea, design]) {
                if (!doc) continue;
                if (!passesScope(weave.id, thread.id, doc.created ?? '')) continue;
                const parked = extractParkedSection(doc.content ?? '');
                if (!parked) continue;
                const firstLine = parked.split('\n').find(l => l.trim().length > 0)?.trim() ?? '';
                items.push({
                    group: 'parked-decision',
                    docId: doc.id, docType: doc.type, weaveSlug: weave.id, threadSlug: thread.id,
                    title: doc.title,
                    detail: `Parked "Open questions" on the ${doc.type} awaiting a call — ${firstLine.slice(0, 160)}`,
                    leverage: downstreamDocs,
                    ready: true,
                    ageDays: ageInDays(doc.created ?? '', nowEpoch),
                });
            }

            // --- stalled-intent: a broken authoring chain (idea→design→plan) -------------
            const stall = (() => {
                if (idea && !design) return { doc: idea, what: 'idea has no design — intent never advanced to how' };
                if (design && (plans?.length ?? 0) === 0) return { doc: design, what: 'design has no plan — how was never broken into steps' };
                const notStarted = (plans ?? []).find(p => p.status === 'active' || p.status === 'draft');
                const anyStarted = (plans ?? []).some(p => p.status === 'implementing' || p.status === 'done');
                if (notStarted && !anyStarted) return { doc: notStarted, what: `plan is ${notStarted.status} but was never started` };
                return null;
            })();
            if (stall && passesScope(weave.id, thread.id, stall.doc.created ?? '')) {
                items.push({
                    group: 'stalled-intent',
                    docId: stall.doc.id, docType: stall.doc.type, weaveSlug: weave.id, threadSlug: thread.id,
                    title: stall.doc.title,
                    detail: `Stalled: ${stall.what}`,
                    leverage: threadDependents,
                    ready: true,
                    ageDays: ageInDays(stall.doc.created ?? '', nowEpoch),
                });
            }

            // --- blocked-work: blocked steps in this thread's implementing plans ---------
            for (const plan of plans ?? []) {
                if (plan.status !== 'implementing') continue;
                if (!passesScope(weave.id, thread.id, plan.created ?? '')) continue;
                for (const step of plan.steps ?? []) {
                    if (step.status === 'done' || step.status === 'cancelled') continue;
                    if (!isStepBlocked(step, plan, state.index)) continue;
                    const dependentSteps = (plan.steps ?? []).filter(s => (s.blockedBy ?? []).includes(step.id)).length;
                    items.push({
                        group: 'blocked-work',
                        docId: plan.id, docType: plan.type, weaveSlug: weave.id, threadSlug: thread.id,
                        title: plan.title,
                        detail: `Blocked step "${step.description.slice(0, 120)}" (waiting on: ${(step.blockedBy ?? []).join(', ')})`,
                        leverage: dependentSteps,
                        ready: false,
                        ageDays: ageInDays(plan.created ?? '', nowEpoch),
                        refs: step.blockedBy ?? [],
                    });
                }
            }
        }

        // --- drift-debt: actionable stale docs in this weave -----------------------------
        for (const entry of staleEntries(weave)) {
            if (!entry.actionable) continue;
            const thread = (weave.threads ?? []).find(t => t.id === entry.threadSlug);
            const doc = (thread?.allDocs ?? []).find(d => d.id === entry.docId);
            const created = doc?.created ?? '';
            if (!passesScope(entry.weaveSlug, entry.threadSlug, created)) continue;
            items.push({
                group: 'drift-debt',
                docId: entry.docId, docType: entry.type, weaveSlug: entry.weaveSlug, threadSlug: entry.threadSlug,
                title: doc?.title ?? entry.docId,
                detail: `Stale (${entry.reason}): ${entry.detail} — never reconciled`,
                leverage: 1,
                ready: true,
                ageDays: ageInDays(created, nowEpoch),
            });
        }
    }

    // --- blocked-work: dependency-blocked threads (roadmap blockedOn) --------------------
    for (const node of roadmap.roadmap) {
        if (node.status !== 'blocked' || node.blockedOn.length === 0) continue;
        if (!passesScope(node.weaveSlug, node.threadSlug, node.created ?? '')) continue;
        items.push({
            group: 'blocked-work',
            docId: node.ulid ?? `${node.weaveSlug}/${node.threadSlug}`,
            docType: 'thread', weaveSlug: node.weaveSlug, threadSlug: node.threadSlug,
            title: node.title,
            detail: `Thread dependency-blocked on ${node.blockedOn.length} unfinished dep(s): ${node.blockedOn.join(', ')}`,
            leverage: node.ulid ? (dependents.get(node.ulid) ?? 0) : 0,
            ready: false,
            ageDays: ageInDays(node.created ?? '', nowEpoch),
            refs: node.blockedOn,
        });
    }

    // Deterministic ranking: leverage desc, ready-first, oldest first, then id (stable).
    items.sort((a, b) =>
        b.leverage - a.leverage ||
        (a.ready === b.ready ? 0 : a.ready ? -1 : 1) ||
        b.ageDays - a.ageDays ||
        (a.docId < b.docId ? -1 : a.docId > b.docId ? 1 : 0),
    );

    const counts: Record<ForwardSignalGroup, number> = {
        'parked-decision': 0, 'stalled-intent': 0, 'blocked-work': 0, 'drift-debt': 0,
    };
    for (const it of items) counts[it.group] += 1;

    return { items, counts, totalItems: items.length, filters, isEmpty: items.length === 0 };
}
