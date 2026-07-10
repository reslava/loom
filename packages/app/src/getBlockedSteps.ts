import { getState, GetStateDeps } from './getState';
import { isStepBlocked } from '../../core/dist';
import { PlanDoc } from '../../core/dist';
import { LinkIndex } from '../../core/dist';

export interface BlockedStep {
    planId: string;
    weaveSlug: string;
    threadSlug: string;
    stepId: string;
    stepNumber: number;
    stepDescription: string;
    blockedBy: string[];
}

export type GetBlockedStepsDeps = GetStateDeps;

/**
 * List all blocked steps across all implementing plans. A step is blocked when its
 * "Blocked by" dependencies are not yet satisfied.
 *
 * Single source of truth for blocked-step listing: both the `loom_get_blocked_steps`
 * MCP tool and the `loom blocked` CLI command call this use-case.
 */
export async function getBlockedSteps(deps: GetBlockedStepsDeps): Promise<BlockedStep[]> {
    const state = await getState(deps);
    const index = state.index as LinkIndex;
    const blocked: BlockedStep[] = [];

    for (const weave of state.weaves) {
        for (const thread of weave.threads) {
            for (const plan of thread.plans as PlanDoc[]) {
                if (plan.status !== 'implementing') continue;
                for (const step of plan.steps ?? []) {
                    if (step.status === 'done' || step.status === 'cancelled') continue;
                    if (isStepBlocked(step, plan, index)) {
                        blocked.push({
                            planId: plan.id,
                            weaveSlug: weave.id,
                            threadSlug: thread.id,
                            stepId: step.id,
                            stepNumber: step.order,
                            stepDescription: step.description,
                            blockedBy: step.blockedBy ?? [],
                        });
                    }
                }
            }
        }
    }

    return blocked;
}
