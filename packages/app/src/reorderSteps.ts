import { resolveWeaveIdForPlan } from '../../fs/dist';
import { PlanDoc } from '../../core/dist/entities/plan';
import { WorkflowEvent } from '../../core/dist/events/workflowEvent';

export interface ReorderStepsInput {
    planUlid: string;
    /** Full ordered list of the plan's step ids. Must be a permutation (no adds/drops). */
    orderedStepIds: string[];
}

export interface ReorderStepsDeps {
    loadWeave: (loomRoot: string, weaveId: string) => Promise<any>;
    runEvent: (weaveId: string, event: WorkflowEvent) => Promise<any>;
    loomRoot: string;
}

export async function reorderSteps(
    input: ReorderStepsInput,
    deps: ReorderStepsDeps
): Promise<{ plan: PlanDoc }> {
    const weaveId = await resolveWeaveIdForPlan(deps.loomRoot, input.planUlid);

    const weave = await deps.loadWeave(deps.loomRoot, weaveId);
    const plan = weave.threads.flatMap((t: any) => t.plans).find((p: any) => p.id === input.planUlid);
    if (!plan) {
        throw new Error(`Plan '${input.planUlid}' not found in weave '${weaveId}'`);
    }

    await deps.runEvent(weaveId, { type: 'REORDER_STEPS', planId: input.planUlid, orderedStepIds: input.orderedStepIds } as WorkflowEvent);

    const updatedWeave = await deps.loadWeave(deps.loomRoot, weaveId);
    const updatedPlan = updatedWeave.threads.flatMap((t: any) => t.plans).find((p: any) => p.id === input.planUlid)!;
    return { plan: updatedPlan };
}
