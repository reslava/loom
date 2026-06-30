import { LoomState, LoomMode } from './entities/state';
import { Weave, WeaveStatus } from './entities/weave';
import { Thread } from './entities/thread';
import { getWeaveStatus, getThreadStatus, DEFAULT_ROADMAP_PRIORITY } from './derived';

// ---------------------------------------------------------------------------
// State summary — the cheap session-start map.
//
// A PURE projection of an already-computed LoomState into a weave/thread
// skeleton + status. It exists because the full `loom://state` payload is the
// whole derived doc graph (every thread's every plan's every step, ~2 MB on the
// Loom repo) when an AI session only needs "what threads exist, what's their
// status, where's the active work". This projection is what `loom://state?shape=summary`
// serves and what `loom status` renders — kilobytes, never step bodies or doc
// content. No new traversal: it maps over the state getState already produced.
// ---------------------------------------------------------------------------

export interface ThreadSummary {
    id: string;
    title: string;
    /** Derived roadmap-ish thread status, lowercased (implementing|active|done|blocked|cancelled). */
    status: string;
    /** Soft ordering among dependency-free slack (lower = earlier). */
    priority: number;
    /** Id of the thread's implementing plan, or null when none is in flight. */
    activePlanId: string | null;
    /** Steps still to do (not done, not cancelled) in the active plan; 0 when none. */
    pendingStepCount: number;
    /** Whether this thread has any actionable stale entries. */
    stale: boolean;
}

export interface WeaveSummary {
    id: string;
    status: WeaveStatus;
    threads: ThreadSummary[];
}

export interface StateSummary {
    mode: LoomMode;
    loomName: string;
    generatedAt: string;
    summary: {
        totalWeaves: number;
        totalPlans: number;
        stalePlans: number;
        blockedSteps: number;
    };
    weaves: WeaveSummary[];
}

function threadSummary(thread: Thread): ThreadSummary {
    const activePlan = thread.plans.find(p => p.status === 'implementing') ?? null;
    const pendingStepCount = activePlan
        ? activePlan.steps.filter(s => s.status !== 'done' && s.status !== 'cancelled').length
        : 0;
    return {
        id: thread.id,
        title: thread.manifest?.title ?? thread.idea?.title ?? thread.id,
        status: getThreadStatus(thread).toLowerCase(),
        priority: thread.manifest?.priority ?? DEFAULT_ROADMAP_PRIORITY,
        activePlanId: activePlan?.id ?? null,
        pendingStepCount,
        stale: (thread.stale?.length ?? 0) > 0,
    };
}

function weaveSummary(weave: Weave): WeaveSummary {
    return {
        id: weave.id,
        status: getWeaveStatus(weave),
        threads: weave.threads.map(threadSummary),
    };
}

/**
 * Project a full LoomState into the lightweight session-start map. Pure — it
 * neither mutates `state` nor re-walks the filesystem. Carries forward whatever
 * weave filtering the caller already applied (the projection is over
 * `state.weaves` as given).
 */
export function toStateSummary(state: LoomState): StateSummary {
    return {
        mode: state.mode,
        loomName: state.loomName,
        generatedAt: state.generatedAt,
        summary: {
            totalWeaves: state.summary.totalWeaves,
            totalPlans: state.summary.totalPlans,
            stalePlans: state.summary.stalePlans,
            blockedSteps: state.summary.blockedSteps,
        },
        weaves: state.weaves.map(weaveSummary),
    };
}
