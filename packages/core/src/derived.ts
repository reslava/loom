import { Weave, WeaveStatus, WeavePhase } from './entities/weave';
import { Thread, ThreadStatus } from './entities/thread';
import { PlanDoc } from './entities/plan';
import { DesignDoc } from './entities/design';
import { ReqDoc } from './entities/req';
import { Document } from './entities/document';
import { LoomState } from './entities/state';
import { compareDates } from './dates';
import { maxVersion } from './versionUtils';

/**
 * ctx, reference, and req docs are perpetual context, not workstream
 * deliverables — they carry a non-`done` status forever (a locked req is the
 * thread's standing spec), so counting them in the every-done check would
 * permanently block a weave/thread from reaching DONE. Exclude them.
 */
function isDeliverable(doc: Document): boolean {
    return doc.type !== 'ctx' && doc.type !== 'reference' && doc.type !== 'req' && doc.type !== 'thread';
}

export function getWeaveStatus(weave: Weave): WeaveStatus {
    const plans = weave.threads.flatMap(t => t.plans);
    const deliverables = weave.allDocs.filter(isDeliverable);

    if (plans.some(p => p.status === 'implementing')) return 'IMPLEMENTING';
    if (deliverables.length > 0 && deliverables.every(d => d.status === 'done')) return 'DONE';
    if (plans.some(p => p.status === 'active' || p.status === 'draft')) return 'ACTIVE';
    if (plans.some(p => p.status === 'blocked')) return 'BLOCKED';
    return 'ACTIVE';
}

export function getWeavePhase(weave: Weave): WeavePhase {
    const plans = weave.threads.flatMap(t => t.plans);
    const hasDesign = weave.threads.some(t => t.design != null);

    if (plans.some(p => p.status === 'implementing' || p.status === 'done')) return 'implementing';
    if (plans.length > 0) return 'planning';
    if (hasDesign) return 'designing';
    return 'ideating';
}

export function isPlanStale(plan: PlanDoc, design: DesignDoc): boolean {
    return plan.design_version < design.version;
}

export function getStalePlans(weave: Weave): PlanDoc[] {
    return weave.threads.flatMap(thread => {
        if (!thread.design) return [];
        return thread.plans.filter(p => isPlanStale(p, thread.design!));
    });
}

/**
 * A downstream doc (idea/design/plan) is req-stale when the thread's req is
 * locked at a version newer than the `req_version` the doc was built against.
 * A doc with no `req_version` has no known baseline — never flagged (so legacy
 * docs and docs authored before a req existed are not false-positived).
 */
export function isReqStale(doc: { req_version?: number }, req?: ReqDoc): boolean {
    if (!req || req.status !== 'locked') return false;
    if (typeof doc.req_version !== 'number') return false;
    return doc.req_version < req.version;
}

/** idea/design/plan in a thread that are req-stale (excluding done/cancelled). */
export function getReqStaleDocs(thread: Thread): Document[] {
    const req = thread.req;
    if (!req || req.status !== 'locked') return [];
    const candidates = [thread.idea, thread.design, ...thread.plans].filter(Boolean) as Document[];
    return candidates.filter(
        d => isReqStale(d as { req_version?: number }, req) && d.status !== 'done' && d.status !== 'cancelled',
    );
}

export function getThreadStatus(thread: Thread): ThreadStatus {
    const plans = thread.plans;
    const deliverables = thread.allDocs.filter(isDeliverable);

    if (plans.some(p => p.status === 'implementing')) return 'IMPLEMENTING';
    if (deliverables.length > 0 && deliverables.every(d => d.status === 'done')) return 'DONE';
    if (plans.some(p => p.status === 'active' || p.status === 'draft')) return 'ACTIVE';
    if (plans.some(p => p.status === 'blocked')) return 'BLOCKED';
    return 'ACTIVE';
}

// ---------------------------------------------------------------------------
// Derived roadmap — the cross-weave read-model (loom/core-engine/roadmap).
//
// Authored input is thin: each thread's `thread.md` carries a `th_` ULID, a soft
// `priority`, and hard `depends_on` edges. EVERYTHING else here is derived from
// document state — thread status, dependency-blocked signal, topological ordering,
// done-plan history, and diagnostics. The function is pure (no IO); the MCP
// resource and CLI are thin renderers over its output. Re-running it over
// unchanged state is deterministic.
// ---------------------------------------------------------------------------

/** A thread's roadmap status. `blocked` is dependency-blocked (see `blockedOn`). */
export type RoadmapStatus = 'done' | 'implementing' | 'active' | 'pending' | 'blocked';

/** Unset `priority` sorts after every explicitly-prioritised thread. Finite (JSON-safe). */
export const DEFAULT_ROADMAP_PRIORITY = 1_000_000;

export interface RoadmapNode {
    /** Folder slug (the human/path handle). */
    threadId: string;
    /** Stable `th_` ULID, or null when the thread has no manifest yet (pre-migration). */
    ulid: string | null;
    weaveId: string;
    title: string;
    status: RoadmapStatus;
    /** Resolved `th_` ULIDs this thread depends on. */
    dependsOn: string[];
    /** The subset of `dependsOn` not yet done (incl. dangling) — the headline signal. */
    blockedOn: string[];
    priority: number;
    /** Manifest/idea created date — used for deterministic tie-breaking. */
    created: string;
}

/** A completed plan — the atomic shipped unit of the history timeline. */
export interface ShippedPlan {
    planId: string;
    planTitle: string;
    threadId: string;
    weaveId: string;
    /** The plan's done-doc `created` (fallback: plan.updated/created). */
    date: string;
    /** The release version this plan shipped in, or null if not yet recorded. */
    release: string | null;
}

export type RoadmapDiagnosticKind = 'cycle' | 'dangling_dep' | 'missing_manifest';

export interface RoadmapDiagnostic {
    kind: RoadmapDiagnosticKind;
    weaveId: string;
    threadId: string;
    detail: string;
    /** Involved `th_` ULIDs (dangling target, cycle edges). */
    refs?: string[];
}

export interface RoadmapView {
    /**
     * Present + future threads in ONE topological-then-priority order — the
     * drag-orderable forward backlog. Status is per-node (`RoadmapNode.status`),
     * never an ordering boundary, so active and pending threads interleave by
     * priority; a consumer that wants a status band filters this list. Done
     * threads are not here — they surface in `history` as shipped plans.
     */
    roadmap: RoadmapNode[];
    /** Completed plans, newest first. */
    history: ShippedPlan[];
    /**
     * The highest release version recorded across shipped plans, or null when no
     * plan carries an `actual_release` yet. Derived (never stored) — the answer
     * to "what version is this project on?" without reading package.json or git.
     */
    currentRelease: string | null;
    diagnostics: RoadmapDiagnostic[];
}

/**
 * Base roadmap status of a thread, BEFORE the dependency-blocked overlay.
 * Distinguishes `pending` (not started — no design, no plan) from `active`
 * (design or a non-done plan exists) — a distinction `getThreadStatus` collapses.
 */
function baseRoadmapStatus(thread: Thread): RoadmapStatus {
    const plans = thread.plans ?? [];
    const deliverables = (thread.allDocs ?? []).filter(isDeliverable);

    if (plans.some(p => p.status === 'implementing')) return 'implementing';
    if (deliverables.length > 0 && deliverables.every(d => d.status === 'done')) return 'done';
    if (plans.some(p => p.status === 'active' || p.status === 'draft' || p.status === 'blocked')) return 'active';
    if (thread.design) return 'active';
    return 'pending';
}

const ROADMAP_CMP = (a: RoadmapNode, b: RoadmapNode): number =>
    a.priority - b.priority ||
    compareDates(a.created, b.created) ||
    (a.threadId < b.threadId ? -1 : a.threadId > b.threadId ? 1 : 0);

/**
 * Kahn topological sort over the non-done node set. Edges run dep → node (a
 * dependency is emitted before the thread that depends on it). Among ready nodes
 * the order is `priority`, then `created`, then `threadId` (deterministic). Nodes
 * left after the queue drains are in a cycle: returned in `cycleNodes` and appended
 * (priority-ordered) so the rest of the roadmap still renders.
 */
function topoOrder(nodes: RoadmapNode[]): { ordered: RoadmapNode[]; cycleNodes: RoadmapNode[] } {
    const nonDone = nodes.filter(n => n.status !== 'done');
    const byUlid = new Map<string, RoadmapNode>();
    for (const n of nonDone) if (n.ulid) byUlid.set(n.ulid, n);

    const indeg = new Map<RoadmapNode, number>();
    const succ = new Map<RoadmapNode, RoadmapNode[]>();
    for (const n of nonDone) { indeg.set(n, 0); succ.set(n, []); }
    for (const n of nonDone) {
        for (const dep of n.dependsOn) {
            const d = byUlid.get(dep);
            if (d && d !== n) {
                indeg.set(n, (indeg.get(n) ?? 0) + 1);
                succ.get(d)!.push(n);
            }
        }
    }

    const ready = nonDone.filter(n => (indeg.get(n) ?? 0) === 0);
    const ordered: RoadmapNode[] = [];
    const placed = new Set<RoadmapNode>();
    while (ready.length > 0) {
        ready.sort(ROADMAP_CMP);
        const n = ready.shift()!;
        ordered.push(n);
        placed.add(n);
        for (const m of succ.get(n)!) {
            indeg.set(m, (indeg.get(m) ?? 0) - 1);
            if ((indeg.get(m) ?? 0) === 0) ready.push(m);
        }
    }

    const cycleNodes = nonDone.filter(n => !placed.has(n)).sort(ROADMAP_CMP);
    return { ordered: [...ordered, ...cycleNodes], cycleNodes };
}

/** Completed plans across all live weaves, newest first, keyed on the done-doc date. */
function buildHistory(state: LoomState): ShippedPlan[] {
    const shipped: ShippedPlan[] = [];
    for (const weave of state.weaves ?? []) {
        for (const thread of weave.threads ?? []) {
            for (const plan of thread.plans ?? []) {
                if (plan.status !== 'done') continue;
                const done = (thread.dones ?? []).find(d => d.parent_id === plan.id);
                const date = done?.created ?? plan.updated ?? plan.created ?? '';
                shipped.push({
                    planId: plan.id,
                    planTitle: plan.title,
                    threadId: thread.id,
                    weaveId: weave.id,
                    date,
                    release: plan.actual_release ?? null,
                });
            }
        }
    }
    // Newest-first, comparing by parsed epoch (not raw string) so a date-only and a
    // full-ISO value of the same day order correctly — the roadmap History fix.
    return shipped.sort((a, b) => compareDates(b.date, a.date));
}

/**
 * Build the derived cross-weave roadmap from state. Pure; reads never mutate.
 * Archived threads (and their `th_` ULIDs) count as satisfied dependency targets.
 */
export function buildRoadmap(state: LoomState): RoadmapView {
    const diagnostics: RoadmapDiagnostic[] = [];
    const nodes: RoadmapNode[] = [];
    // ULID → base status, used to decide whether a dependency is satisfied (done).
    const baseByUlid = new Map<string, RoadmapStatus>();

    // Archived threads are closed work — their manifests satisfy dependencies.
    for (const weave of state.archivedWeaves ?? []) {
        for (const thread of weave.threads ?? []) {
            const ulid = thread.manifest?.id;
            if (ulid) baseByUlid.set(ulid, 'done');
        }
    }

    for (const weave of state.weaves ?? []) {
        for (const thread of weave.threads ?? []) {
            const base = baseRoadmapStatus(thread);
            const ulid = thread.manifest?.id ?? null;
            if (ulid) baseByUlid.set(ulid, base);
            nodes.push({
                threadId: thread.id,
                ulid,
                weaveId: weave.id,
                title: thread.manifest?.title ?? thread.idea?.title ?? thread.id,
                status: base,
                dependsOn: [...(thread.manifest?.depends_on ?? [])],
                blockedOn: [],
                priority: thread.manifest?.priority ?? DEFAULT_ROADMAP_PRIORITY,
                created: thread.manifest?.created ?? thread.idea?.created ?? '',
            });
            if (!thread.manifest) {
                diagnostics.push({
                    kind: 'missing_manifest',
                    weaveId: weave.id,
                    threadId: thread.id,
                    detail: `Thread ${weave.id}/${thread.id} has no thread.md — run \`loom migrate\`.`,
                });
            }
        }
    }

    // Dependency-blocked overlay: a non-done thread with any unsatisfied dep → blocked.
    for (const node of nodes) {
        if (node.status === 'done') continue;
        for (const dep of node.dependsOn) {
            const target = baseByUlid.get(dep);
            if (target === undefined) {
                node.blockedOn.push(dep);
                diagnostics.push({
                    kind: 'dangling_dep',
                    weaveId: node.weaveId,
                    threadId: node.threadId,
                    detail: `depends_on references unknown thread ${dep}`,
                    refs: [dep],
                });
            } else if (target !== 'done') {
                node.blockedOn.push(dep);
            }
        }
        if (node.blockedOn.length > 0) node.status = 'blocked';
    }

    const { ordered, cycleNodes } = topoOrder(nodes);
    for (const n of cycleNodes) {
        diagnostics.push({
            kind: 'cycle',
            weaveId: n.weaveId,
            threadId: n.threadId,
            detail: `Thread ${n.weaveId}/${n.threadId} is in a depends_on cycle`,
            refs: n.dependsOn,
        });
    }

    const history = buildHistory(state);
    return {
        roadmap: ordered,
        history,
        currentRelease: maxVersion(history.map(h => h.release)),
        diagnostics,
    };
}
