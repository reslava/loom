import * as fs from 'fs-extra';
import * as path from 'path';
import { saveDoc, loadDoc, resolveWeaveIdForPlan } from '../../fs/dist';
import { today } from '../../core/dist';
import { DoneDoc } from '../../core/dist/entities/done';
import { PlanDoc } from '../../core/dist/entities/plan';
import { planReducer } from '../../core/dist/reducers/planReducer';

export interface ClosePlanInput {
    planId: string;
    notes?: string;
}

export interface ClosePlanDeps {
    loadWeave: (loomRoot: string, weaveId: string) => Promise<any>;
    saveDoc: typeof saveDoc;
    fs: typeof fs;
    loomRoot: string;
}

/**
 * Finalize a completed plan. This use-case does NOT generate the done-doc body via
 * inference — the agent (Claude itself, on the primary path) authors the implementation
 * record via `loom_append_done` per step. closePlan only:
 *   1. Optionally writes `notes` verbatim into the done doc (closing summary), and
 *   2. Runs the FINISH_PLAN reducer and persists the plan (in-place for a thread plan,
 *      moved to done/ for a flat/loose plan).
 *
 * If neither `notes` nor an existing done doc is present, it throws rather than writing
 * a placeholder stub — a missing done record is a loud failure, never a silent one.
 */
export async function closePlan(
    input: ClosePlanInput,
    deps: ClosePlanDeps
): Promise<{ donePath: string; planId: string }> {
    const weaveId = await resolveWeaveIdForPlan(deps.loomRoot, input.planId);
    const weave = await deps.loadWeave(deps.loomRoot, weaveId);
    const plan = weave.threads.flatMap((t: any) => t.plans).find((p: PlanDoc) => p.id === input.planId) as PlanDoc | undefined;
    if (!plan) throw new Error(`Plan '${input.planId}' not found in weave '${weaveId}'.`);

    const thread = weave.threads.find((t: any) => t.plans.some((p: any) => p.id === input.planId)) as any;

    const weavePath = path.join(deps.loomRoot, 'loom', weaveId);
    const threadPath = thread ? path.join(weavePath, thread.id) : null;
    const doneDirPath = threadPath ? path.join(threadPath, 'done') : path.join(weavePath, 'done');

    const doneId = `${input.planId}-done`;
    const donePath = path.join(doneDirPath, `${doneId}.md`);
    const doneExists = await deps.fs.pathExists(donePath);

    const notes = input.notes?.trim();

    // No done content and nothing to write — fail loud instead of stubbing.
    if (!notes && !doneExists) {
        throw new Error(
            `No done content for plan '${input.planId}': the done doc does not exist and no notes were provided. ` +
            `Author it with loom_append_done per step, or pass notes to loom_close_plan.`
        );
    }

    await deps.fs.ensureDir(doneDirPath);

    if (notes) {
        if (doneExists) {
            // Done doc already authored per-step — append the notes as a closing section.
            const existing = await loadDoc(donePath) as DoneDoc;
            const body = (existing.content ?? '').replace(/\n+$/, '');
            const updated: DoneDoc = {
                ...existing,
                content: `${body}\n\n## Closing notes\n\n${notes}\n`,
                version: existing.version + 1,
            };
            await deps.saveDoc(updated, donePath);
        } else {
            // No per-step record — the notes become the done doc body verbatim.
            const doneDoc: DoneDoc = {
                type: 'done',
                id: doneId,
                title: `Done — ${plan.title}`,
                status: 'done',
                created: today(),
                version: 1,
                tags: [],
                parent_id: input.planId,
                requires_load: [],
                content: `\n${notes}\n`,
            };
            await deps.saveDoc(doneDoc, donePath);
        }
    }
    // else: notes absent but done doc exists → leave the per-step record untouched.

    let updatedPlan = plan;
    if (plan.status === 'implementing') {
        updatedPlan = planReducer(plan, { type: 'FINISH_PLAN' });
    }

    if (threadPath) {
        // Thread plan: update in place; done doc is the separate record.
        const planPath = (plan as any)._path ?? path.join(threadPath, 'plans', `${input.planId}.md`);
        await deps.saveDoc(updatedPlan, planPath);
    } else {
        // Flat/loose plan: move to done/.
        const newPlanPath = path.join(doneDirPath, `${input.planId}.md`);
        await deps.saveDoc(updatedPlan, newPlanPath);
        const oldPlanPath = (plan as any)._path as string | undefined;
        if (oldPlanPath && await deps.fs.pathExists(oldPlanPath)) {
            await deps.fs.remove(oldPlanPath);
        }
    }

    return { donePath, planId: input.planId };
}
