import { resolveWeaveSlugForPlan } from '../../fs/dist';
import { PlanDoc } from '../../core/dist/entities/plan';
import { WorkflowEvent } from '../../core/dist/events/workflowEvent';

export interface RemoveStepInput {
    planUlid: string;
    stepId: string;
}

export interface RemoveStepDeps {
    loadWeave: (loomRoot: string, weaveId: string) => Promise<any>;
    runEvent: (weaveId: string, event: WorkflowEvent) => Promise<any>;
    loomRoot: string;
}

/** Remove a pending step. Returns the updated plan and the ids of the steps whose
 *  `blockedBy` referenced the removed step (those references are stripped — no
 *  dangling blocker). The report is computed from the pre-removal state, which the
 *  pure reducer strips exactly. */
export async function removeStep(
    input: RemoveStepInput,
    deps: RemoveStepDeps
): Promise<{ plan: PlanDoc; strippedBlockers: string[] }> {
    const weaveId = await resolveWeaveSlugForPlan(deps.loomRoot, input.planUlid);

    const weave = await deps.loadWeave(deps.loomRoot, weaveId);
    const plan = weave.threads.flatMap((t: any) => t.plans).find((p: any) => p.id === input.planUlid);
    if (!plan) {
        throw new Error(`Plan '${input.planUlid}' not found in weave '${weaveId}'`);
    }

    // Which surviving steps reference the removed step as a blocker? Their references
    // will be stripped by the reducer; report them so the caller can re-thread deps.
    const strippedBlockers: string[] = plan.steps
        .filter((s: any) => s.id !== input.stepId && Array.isArray(s.blockedBy) && s.blockedBy.includes(input.stepId))
        .map((s: any) => s.id);

    await deps.runEvent(weaveId, { type: 'REMOVE_STEP', planId: input.planUlid, stepId: input.stepId } as WorkflowEvent);

    const updatedWeave = await deps.loadWeave(deps.loomRoot, weaveId);
    const updatedPlan = updatedWeave.threads.flatMap((t: any) => t.plans).find((p: any) => p.id === input.planUlid)!;
    return { plan: updatedPlan, strippedBlockers };
}
