import { resolveWeaveSlugForPlan } from '../../fs/dist';
import { PlanDoc } from '../../core/dist/entities/plan';
import { WorkflowEvent } from '../../core/dist/events/workflowEvent';

export interface ReorderStepsInput {
    planUlid: string;
    /** Full ordered list of the plan's step ids. Must be a permutation (no adds/drops). */
    orderedStepIds: string[];
}

export interface ReorderStepsDeps {
    loadWeave: (loomRoot: string, weaveSlug: string) => Promise<any>;
    runEvent: (weaveSlug: string, event: WorkflowEvent) => Promise<any>;
    loomRoot: string;
}

export async function reorderSteps(
    input: ReorderStepsInput,
    deps: ReorderStepsDeps
): Promise<{ plan: PlanDoc }> {
    const weaveSlug = await resolveWeaveSlugForPlan(deps.loomRoot, input.planUlid);

    const weave = await deps.loadWeave(deps.loomRoot, weaveSlug);
    const plan = weave.threads.flatMap((t: any) => t.plans).find((p: any) => p.id === input.planUlid);
    if (!plan) {
        throw new Error(`Plan '${input.planUlid}' not found in weave '${weaveSlug}'`);
    }

    await deps.runEvent(weaveSlug, { type: 'REORDER_STEPS', planId: input.planUlid, orderedStepIds: input.orderedStepIds } as WorkflowEvent);

    const updatedWeave = await deps.loadWeave(deps.loomRoot, weaveSlug);
    const updatedPlan = updatedWeave.threads.flatMap((t: any) => t.plans).find((p: any) => p.id === input.planUlid)!;
    return { plan: updatedPlan };
}
