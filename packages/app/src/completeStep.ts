import { loadWeave, resolveWeaveSlugForPlan } from '../../fs/dist';
import { runEvent } from './runEvent';
import { PlanDoc } from '../../core/dist/entities/plan';
import { WorkflowEvent } from '../../core/dist/events/workflowEvent';

export interface CompleteStepInput {
    planUlid: string;
    step: number;
}

export interface CompleteStepDeps {
    loadWeave: (loomRoot: string, weaveSlug: string) => Promise<any>;
    runEvent: (weaveSlug: string, event: WorkflowEvent) => Promise<any>;
    loomRoot: string;
}

export async function completeStep(
    input: CompleteStepInput,
    deps: CompleteStepDeps
): Promise<{ plan: PlanDoc; autoCompleted: boolean }> {
    const weaveSlug = await resolveWeaveSlugForPlan(deps.loomRoot, input.planUlid);
    const stepIndex = input.step - 1;

    const weave = await deps.loadWeave(deps.loomRoot, weaveSlug);
    const plan = weave.threads.flatMap((t: any) => t.plans).find((p: any) => p.id === input.planUlid);

    if (!plan) {
        throw new Error(`Plan '${input.planUlid}' not found in weave '${weaveSlug}'`);
    }

    if (plan.status !== 'implementing') {
        throw new Error(`Plan must be 'implementing' to complete steps. Current status: ${plan.status}`);
    }

    if (stepIndex < 0 || stepIndex >= plan.steps.length) {
        throw new Error(`Step ${input.step} does not exist. Plan has ${plan.steps.length} steps.`);
    }

    if (plan.steps[stepIndex].status === 'done') {
        throw new Error(`Step ${input.step} is already completed.`);
    }

    await deps.runEvent(weaveSlug, { type: 'COMPLETE_STEP', planId: input.planUlid, stepIndex } as WorkflowEvent);

    const updatedWeave = await deps.loadWeave(deps.loomRoot, weaveSlug);
    const updatedPlan = updatedWeave.threads.flatMap((t: any) => t.plans).find((p: any) => p.id === input.planUlid)!;
    const autoCompleted = updatedPlan.status === 'done';

    return { plan: updatedPlan, autoCompleted };
}