import { Weave, WeaveStatus, WeavePhase } from './entities/weave';
import { Thread, ThreadStatus } from './entities/thread';
import { PlanDoc } from './entities/plan';
import { DesignDoc } from './entities/design';
import { ReqDoc } from './entities/req';
import { Document } from './entities/document';

/**
 * ctx, reference, and req docs are perpetual context, not workstream
 * deliverables — they carry a non-`done` status forever (a locked req is the
 * thread's standing spec), so counting them in the every-done check would
 * permanently block a weave/thread from reaching DONE. Exclude them.
 */
function isDeliverable(doc: Document): boolean {
    return doc.type !== 'ctx' && doc.type !== 'reference' && doc.type !== 'req';
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
