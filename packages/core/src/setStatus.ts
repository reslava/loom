/**
 * Pure decision function behind the single status verb (loom_set_status).
 *
 * Status changes split into two kinds:
 *  - FREE LABEL — the ordinary lifecycle of a plain doc (idea/design/ctx/reference/…):
 *    a simple field flip with no side effects. set_status owns these.
 *  - GUARDED — a transition a dedicated tool owns because it does real work:
 *      plan → implementing  (loom_start_plan: runs the START_IMPLEMENTING_PLAN transition)
 *      plan → done          (loom_close_plan: earned by completing steps; writes the done record)
 *      req  → locked        (loom_finalize_req: anchors the thread scope)
 *    set_status REFUSES these and names the owning tool, so "done" for a plan can never
 *    be merely *set* (the false-step / buttons-must-do-real-work rule).
 *
 * A pure lookup, no IO — so it lives in core and is trivially testable.
 */
export type SetStatusDecision =
    | { kind: 'allow' }
    | { kind: 'delegate'; tool: string; reason: string }
    | { kind: 'reject'; reason: string };

/** Valid status values per doc type (mirrors each entity's *Status union). */
const VALID_STATUSES: Record<string, readonly string[]> = {
    idea: ['draft', 'active', 'done', 'cancelled'],
    design: ['draft', 'active', 'closed', 'done', 'cancelled'],
    plan: ['draft', 'active', 'implementing', 'done', 'blocked', 'cancelled'],
    ctx: ['draft', 'active', 'done', 'cancelled'],
    req: ['draft', 'locked'],
    reference: ['active', 'archived'],
    chat: ['active', 'done', 'archived'],
    done: ['done'],
    thread: ['active'],
};

/** Transitions a dedicated guarded tool owns — set_status delegates, never performs. */
const DELEGATED: Record<string, { tool: string; reason: string }> = {
    'plan:implementing': {
        tool: 'loom_start_plan',
        reason: 'starting a plan runs the START_IMPLEMENTING_PLAN transition',
    },
    'plan:done': {
        tool: 'loom_close_plan',
        reason: 'a plan reaches "done" only when all its steps are complete; loom_close_plan writes the done record',
    },
    'req:locked': {
        tool: 'loom_finalize_req',
        reason: 'locking a req anchors the thread scope',
    },
};

/**
 * Decide what set_status should do with a (docType, targetStatus) pair:
 * allow the free label flip, delegate a guarded transition to its owning tool,
 * or reject a status that is not valid for the type.
 */
export function decideSetStatus(docType: string, targetStatus: string): SetStatusDecision {
    const valid = VALID_STATUSES[docType];
    if (!valid) {
        return { kind: 'reject', reason: `Unknown doc type '${docType}' — cannot set status.` };
    }
    if (!valid.includes(targetStatus)) {
        return {
            kind: 'reject',
            reason: `'${targetStatus}' is not a valid status for a ${docType} (valid: ${valid.join(', ')}).`,
        };
    }
    const delegated = DELEGATED[`${docType}:${targetStatus}`];
    if (delegated) {
        return { kind: 'delegate', tool: delegated.tool, reason: delegated.reason };
    }
    return { kind: 'allow' };
}
