import { resolveWeaveSlugForPlan } from '../../fs/dist';
import { PlanDoc } from '../../core/dist/entities/plan';
import { NewStep, StepPosition } from '../../core/dist/events/planEvents';
import { WorkflowEvent } from '../../core/dist/events/workflowEvent';

/** Add-step input at the use-case boundary. `files` maps to the step's `files_touched`;
 *  `title`/`detail` seed the new step's body detail section (Option-A saver). */
export interface AddStepInput {
    planUlid: string;
    step: {
        description: string;
        title?: string;
        files?: string[];
        blockedBy?: string[];
        satisfies?: string[];
        detail?: string;
    };
    position?: StepPosition;
}

export interface AddStepDeps {
    loadWeave: (loomRoot: string, weaveId: string) => Promise<any>;
    runEvent: (weaveId: string, event: WorkflowEvent) => Promise<any>;
    loomRoot: string;
}

export async function addStep(
    input: AddStepInput,
    deps: AddStepDeps
): Promise<{ plan: PlanDoc }> {
    if (!input.step || !input.step.description || !input.step.description.trim()) {
        throw new Error('addStep requires step.description.');
    }

    const weaveId = await resolveWeaveSlugForPlan(deps.loomRoot, input.planUlid);

    const weave = await deps.loadWeave(deps.loomRoot, weaveId);
    const plan = weave.threads.flatMap((t: any) => t.plans).find((p: any) => p.id === input.planUlid);
    if (!plan) {
        throw new Error(`Plan '${input.planUlid}' not found in weave '${weaveId}'`);
    }

    const step: NewStep = {
        description: input.step.description,
        ...(input.step.title !== undefined ? { title: input.step.title } : {}),
        ...(input.step.files !== undefined ? { files_touched: input.step.files } : {}),
        ...(input.step.blockedBy !== undefined ? { blockedBy: input.step.blockedBy } : {}),
        ...(input.step.satisfies !== undefined ? { satisfies: input.step.satisfies } : {}),
        ...(input.step.detail !== undefined ? { detail: input.step.detail } : {}),
    };

    await deps.runEvent(weaveId, {
        type: 'ADD_STEP',
        planId: input.planUlid,
        step,
        ...(input.position !== undefined ? { position: input.position } : {}),
    } as WorkflowEvent);

    const updatedWeave = await deps.loadWeave(deps.loomRoot, weaveId);
    const updatedPlan = updatedWeave.threads.flatMap((t: any) => t.plans).find((p: any) => p.id === input.planUlid)!;
    return { plan: updatedPlan };
}
