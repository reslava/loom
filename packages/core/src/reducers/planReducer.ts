import { PlanDoc, PlanStep } from '../entities/plan';
import { PlanEvent } from '../events/planEvents';
import { slugifyStepId } from '../planTableUtils';
import { resolveBlockedByIds } from '../planUtils';

/** Count of contiguous done/cancelled steps at the head of the plan — the immutable
 *  leading block. New steps may only be inserted at or after this boundary, keeping
 *  the same history invariant REORDER_STEPS enforces. */
function leadingTerminalCount(steps: PlanStep[]): number {
    let n = 0;
    for (const s of steps) {
        if (s.status === 'done' || s.status === 'cancelled') n++;
        else break;
    }
    return n;
}

function today(): string {
    return new Date().toISOString().split('T')[0];
}

function assertStatus(current: string, allowed: string[], action: string): void {
    if (!allowed.includes(current)) {
        throw new Error(
            `Invalid transition: ${action} requires status ${allowed.join(' | ')}, got '${current}'`
        );
    }
}

export function planReducer(doc: PlanDoc, event: PlanEvent): PlanDoc {
    const updated = today();

    switch (event.type) {
        case 'CREATE_PLAN':
            return { ...doc, status: 'draft' };

        case 'ACTIVATE_PLAN':
            assertStatus(doc.status, ['draft'], 'ACTIVATE_PLAN');
            return { ...doc, status: 'active', updated };

        case 'START_IMPLEMENTING_PLAN':
            assertStatus(doc.status, ['active'], 'START_IMPLEMENTING_PLAN');
            return { ...doc, status: 'implementing', updated };

        case 'COMPLETE_STEP': {
            assertStatus(doc.status, ['implementing'], 'COMPLETE_STEP');
            const { stepIndex } = event;
            if (stepIndex < 0 || stepIndex >= doc.steps.length) {
                throw new Error(`Invalid step index: ${stepIndex}. Plan has ${doc.steps.length} steps.`);
            }
            const steps = doc.steps.map((step, idx) =>
                idx === stepIndex ? { ...step, status: 'done' as const } : step
            );
            const allDone = steps.every(s => s.status === 'done' || s.status === 'cancelled');
            return {
                ...doc,
                steps,
                status: allDone ? 'done' : doc.status,
                updated,
            };
        }

        case 'UPDATE_STEP': {
            const { stepId, patch } = event;
            // A citation-only patch (`satisfies` and nothing else) is traceability
            // metadata — *what this work served*, not the immutable record of *what was
            // done* — so it may amend a done step and a done plan. This is what lets a
            // requirement added or clarified mid-thread (via amend + re-lock) be cited on
            // the work that already satisfies it. Any other field keeps the original guards.
            const citationOnly =
                patch.satisfies !== undefined &&
                patch.description === undefined &&
                patch.files_touched === undefined &&
                patch.blockedBy === undefined;
            assertStatus(
                doc.status,
                citationOnly
                    ? ['draft', 'active', 'implementing', 'blocked', 'done']
                    : ['draft', 'active', 'implementing', 'blocked'],
                'UPDATE_STEP'
            );
            const idx = doc.steps.findIndex(s => s.id === stepId);
            if (idx === -1) {
                throw new Error(`Step '${stepId}' not found. Plan steps: ${doc.steps.map(s => s.id).join(', ') || '(none)'}`);
            }
            const target = doc.steps[idx];
            if (target.status === 'cancelled') {
                throw new Error(
                    `Step '${stepId}' is cancelled and immutable — cancelled work satisfies nothing. ` +
                    `Record corrections forward (a new step or a note), not by mutating the past.`
                );
            }
            if (target.status === 'done' && !citationOnly) {
                throw new Error(
                    `Step '${stepId}' is done and immutable except for requirement citations — ` +
                    `only \`satisfies\` may be amended on a done step (it records what the work served, ` +
                    `not what was done). Record other corrections forward (a new step or a note).`
                );
            }
            // blockedBy is normalized to stable slug ids (same helper as create) so a
            // numeric ordinal supplied to update is never persisted verbatim. The reducer is
            // pure and holds no link index, so it calls the resolver predicate-free and takes
            // .ids only — cross-plan refs store verbatim. Dangling-plan warnings are the app
            // layer's job (it holds the index); the standing diagnostic is the guarantee.
            const orderedIds = doc.steps.map(st => st.id);
            const steps = doc.steps.map((s, i) =>
                i === idx
                    ? {
                          ...s,
                          ...(patch.description !== undefined ? { description: patch.description } : {}),
                          ...(patch.files_touched !== undefined ? { files_touched: patch.files_touched } : {}),
                          ...(patch.blockedBy !== undefined ? { blockedBy: resolveBlockedByIds(patch.blockedBy, orderedIds, stepId).ids } : {}),
                          ...(patch.satisfies !== undefined ? { satisfies: patch.satisfies } : {}),
                      }
                    : s
            );
            return { ...doc, steps, updated };
        }

        case 'ADD_STEP': {
            assertStatus(doc.status, ['draft', 'active', 'implementing', 'blocked'], 'ADD_STEP');
            const { step, position } = event;
            if (!step || !step.description || !step.description.trim()) {
                throw new Error('ADD_STEP requires a non-empty step.description.');
            }

            // Resolve the insertion index from the position.
            let insertAt = doc.steps.length; // 'append' (default)
            if (position && position !== 'append') {
                const refId = 'after' in position ? position.after : position.before;
                const refIdx = doc.steps.findIndex(s => s.id === refId);
                if (refIdx === -1) {
                    throw new Error(`Position reference step '${refId}' not found. Plan steps: ${doc.steps.map(s => s.id).join(', ') || '(none)'}`);
                }
                insertAt = 'after' in position ? refIdx + 1 : refIdx;
            }

            // A new (pending) step may not land before the leading done/cancelled block —
            // that would reorder immutable history, the same guard REORDER_STEPS applies.
            const leading = leadingTerminalCount(doc.steps);
            if (insertAt < leading) {
                throw new Error(
                    `Cannot insert a step before the leading completed/cancelled block ` +
                    `(${leading} step${leading === 1 ? '' : 's'}). Insert after them or append.`
                );
            }

            const id = slugifyStepId(step.title || step.description, new Set(doc.steps.map(s => s.id)));
            const newStep: PlanStep = {
                id,
                order: 0, // recomputed below
                status: 'pending',
                title: step.title || step.description,
                description: step.description,
                files_touched: step.files_touched ?? [],
                blockedBy: step.blockedBy ?? [],
                satisfies: step.satisfies ?? [],
                ...(step.detail !== undefined ? { detail: step.detail } : {}),
            };

            const next = [...doc.steps];
            next.splice(insertAt, 0, newStep);
            // Normalize the new step's blockedBy against the FINAL order (ordinals → the id
            // at that position; slugs / plan-ids pass through; out-of-range throws; self-block
            // rejected). Existing steps already carry resolved slug ids, so only the new one
            // needs resolving.
            const orderedIds = next.map(s => s.id);
            const steps = next.map((s, i) => ({
                ...s,
                order: i + 1,
                ...(s.id === id ? { blockedBy: resolveBlockedByIds(s.blockedBy, orderedIds, id).ids } : {}),
            }));
            return { ...doc, steps, updated };
        }

        case 'REMOVE_STEP': {
            assertStatus(doc.status, ['draft', 'active', 'implementing', 'blocked'], 'REMOVE_STEP');
            const { stepId } = event;
            const idx = doc.steps.findIndex(s => s.id === stepId);
            if (idx === -1) {
                throw new Error(`Step '${stepId}' not found. Plan steps: ${doc.steps.map(s => s.id).join(', ') || '(none)'}`);
            }
            const target = doc.steps[idx];
            if (target.status === 'done' || target.status === 'cancelled') {
                throw new Error(
                    `Step '${stepId}' is ${target.status} and immutable — done/cancelled steps are history. ` +
                    `Record corrections forward (a new step or a note), not by removing the past.`
                );
            }
            // Remove the step, strip any blockedBy references to it from the survivors
            // (no dangling blocker), and recompute order 1..n.
            const steps = doc.steps
                .filter(s => s.id !== stepId)
                .map((s, i) => ({
                    ...s,
                    order: i + 1,
                    blockedBy: s.blockedBy.filter(b => b !== stepId),
                }));
            return { ...doc, steps, updated };
        }

        case 'REORDER_STEPS': {
            assertStatus(doc.status, ['draft', 'active', 'implementing', 'blocked'], 'REORDER_STEPS');
            const { orderedStepIds } = event;
            const currentIds = doc.steps.map(s => s.id);
            const isPermutation =
                orderedStepIds.length === currentIds.length &&
                new Set(orderedStepIds).size === orderedStepIds.length &&
                orderedStepIds.every(id => currentIds.includes(id));
            if (!isPermutation) {
                throw new Error(`orderedStepIds must be a permutation of the plan's step ids (no adds/drops): ${currentIds.join(', ')}`);
            }
            // Done/cancelled steps are immutable history: they must stay the contiguous
            // leading block, in their original relative order. Only pending work reorders.
            const terminalIds = doc.steps
                .filter(s => s.status === 'done' || s.status === 'cancelled')
                .map(s => s.id);
            const newLeading = orderedStepIds.slice(0, terminalIds.length);
            if (terminalIds.join(' ') !== newLeading.join(' ')) {
                throw new Error(
                    `Completed/cancelled steps must remain the leading block in their original order ` +
                    `(${terminalIds.join(', ') || '(none)'}). Reorder only pending steps.`
                );
            }
            const byId = new Map(doc.steps.map(s => [s.id, s]));
            const steps = orderedStepIds.map((id, i) => ({ ...byId.get(id)!, order: i + 1 }));
            return { ...doc, steps, updated };
        }

        case 'RECORD_RELEASE': {
            // Mechanism only: stamp the shipped release version on a done plan.
            // The live-vs-backfill / skip-already-stamped policy lives in the
            // `recordRelease` use-case — the reducer is an unconditional setter so
            // a caller that fired the event has already decided to write.
            //
            // Deliberately does NOT bump `updated`: actual_release records a *past*
            // ship, not a fresh edit, and `buildHistory` falls back to `plan.updated`
            // for the ship date when a plan has no done-doc — bumping it here would
            // shove every stamped plan to "today" and scramble the history order.
            assertStatus(doc.status, ['done'], 'RECORD_RELEASE');
            if (!event.release || !event.release.trim()) {
                throw new Error('RECORD_RELEASE requires a non-empty release version.');
            }
            return { ...doc, actual_release: event.release };
        }

        case 'FINISH_PLAN':
            assertStatus(doc.status, ['implementing'], 'FINISH_PLAN');
            return { ...doc, status: 'done', updated };

        case 'BLOCK_PLAN':
            assertStatus(doc.status, ['active', 'implementing'], 'BLOCK_PLAN');
            return { ...doc, status: 'blocked', updated };

        case 'UNBLOCK_PLAN':
            assertStatus(doc.status, ['blocked'], 'UNBLOCK_PLAN');
            return { ...doc, status: 'active', updated };

        case 'CANCEL_PLAN':
            assertStatus(doc.status, ['draft', 'active', 'implementing', 'blocked'], 'CANCEL_PLAN');
            return { ...doc, status: 'cancelled', updated };

        default: {
            const _exhaustive: never = event;
            throw new Error(`Unknown event type: ${(event as any).type}`);
        }
    }
}