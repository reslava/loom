import { Weave, WeaveStatus, WeavePhase } from './entities/weave';
import { Thread, ThreadStatus } from './entities/thread';
import { PlanDoc } from './entities/plan';
import { DesignDoc } from './entities/design';
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

export function getThreadStatus(thread: Thread): ThreadStatus {
    const plans = thread.plans;
    const deliverables = thread.allDocs.filter(isDeliverable);

    if (plans.some(p => p.status === 'implementing')) return 'IMPLEMENTING';
    if (deliverables.length > 0 && deliverables.every(d => d.status === 'done')) return 'DONE';
    if (plans.some(p => p.status === 'active' || p.status === 'draft')) return 'ACTIVE';
    if (plans.some(p => p.status === 'blocked')) return 'BLOCKED';
    return 'ACTIVE';
}
