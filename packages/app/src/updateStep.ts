import { resolveWeaveSlugForPlan } from '../../fs/dist';
import { runEvent } from './runEvent';
import { PlanDoc } from '../../core/dist/entities/plan';
import { WorkflowEvent } from '../../core/dist/events/workflowEvent';

/** Patch input at the use-case boundary. `files` maps to the step's `files_touched`.
 *  title/detail are intentionally absent — they are body prose, edited via patch_doc. */
export interface UpdateStepInput {
    planUlid: string;
    stepId: string;
    patch: {
        description?: string;
        files?: string[];
        blockedBy?: string[];
        satisfies?: string[];
    };
}

export interface UpdateStepDeps {
    loadWeave: (loomRoot: string, weaveSlug: string) => Promise<any>;
    runEvent: (weaveSlug: string, event: WorkflowEvent) => Promise<any>;
    loomRoot: string;
}

export async function updateStep(
    input: UpdateStepInput,
    deps: UpdateStepDeps
): Promise<{ plan: PlanDoc }> {
    const weaveSlug = await resolveWeaveSlugForPlan(deps.loomRoot, input.planUlid);

    const weave = await deps.loadWeave(deps.loomRoot, weaveSlug);
    const plan = weave.threads.flatMap((t: any) => t.plans).find((p: any) => p.id === input.planUlid);
    if (!plan) {
        throw new Error(`Plan '${input.planUlid}' not found in weave '${weaveSlug}'`);
    }

    const patch = {
        ...(input.patch.description !== undefined ? { description: input.patch.description } : {}),
        ...(input.patch.files !== undefined ? { files_touched: input.patch.files } : {}),
        ...(input.patch.blockedBy !== undefined ? { blockedBy: input.patch.blockedBy } : {}),
        ...(input.patch.satisfies !== undefined ? { satisfies: input.patch.satisfies } : {}),
    };
    if (Object.keys(patch).length === 0) {
        throw new Error('Nothing to update — provide at least one of description, files, blockedBy, satisfies. (title/detail are body prose — use loom_patch_doc.)');
    }

    await deps.runEvent(weaveSlug, { type: 'UPDATE_STEP', planId: input.planUlid, stepId: input.stepId, patch } as WorkflowEvent);

    const updatedWeave = await deps.loadWeave(deps.loomRoot, weaveSlug);
    const updatedPlan = updatedWeave.threads.flatMap((t: any) => t.plans).find((p: any) => p.id === input.planUlid)!;
    return { plan: updatedPlan };
}
