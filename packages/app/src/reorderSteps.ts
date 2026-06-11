import { resolveWeaveIdForPlan } from '../../fs/dist';
import { PlanDoc } from '../../core/dist/entities/plan';
import { WorkflowEvent } from '../../core/dist/events/workflowEvent';

export interface ReorderStepsInput {
    planId: string;
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
    const weaveId = await resolveWeaveIdForPlan(deps.loomRoot, input.planId);

    const weave = await deps.loadWeave(deps.loomRoot, weaveId);
    const plan = weave.threads.flatMap((t: any) => t.plans).find((p: any) => p.id === input.planId);
    if (!plan) {
        throw new Error(`Plan '${input.planId}' not found in weave '${weaveId}'`);
    }

    await deps.runEvent(weaveId, { type: 'REORDER_STEPS', planId: input.planId, orderedStepIds: input.orderedStepIds } as WorkflowEvent);

    const updatedWeave = await deps.loadWeave(deps.loomRoot, weaveId);
    const updatedPlan = updatedWeave.threads.flatMap((t: any) => t.plans).find((p: any) => p.id === input.planId)!;
    return { plan: updatedPlan };
}
