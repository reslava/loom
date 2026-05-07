import * as fs from 'fs-extra';
import * as path from 'path';
import { saveDoc, resolveWeaveIdForPlan } from '../../fs/dist';
import { AIClient, Message } from '../../core/dist';
import { DoneDoc } from '../../core/dist/entities/done';
import { PlanDoc } from '../../core/dist/entities/plan';
import { planReducer } from '../../core/dist/reducers/planReducer';
import { serializeFrontmatter } from '../../core/dist/frontmatterUtils';

export interface ClosePlanInput {
    planId: string;
    notes?: string;
}

export interface ClosePlanDeps {
    loadWeave: (loomRoot: string, weaveId: string) => Promise<any>;
    saveDoc: typeof saveDoc;
    fs: typeof fs;
    aiClient: AIClient;
    loomRoot: string;
}

const SYSTEM_PROMPT = `You are an AI assistant embedded in REslava Loom, generating a post-plan implementation record (done doc).

You will be given a completed plan with its steps. Generate a structured implementation record with EXACTLY these sections in this order:

## What was built
<narrative — what the implementation actually delivered, in plain language>

## Steps completed
| # | Step | Notes |
|---|------|-------|
| 1 | description | any deviation from the plan |

## Decisions made
- <decision locked in during implementation that wasn't in the plan>

## Files touched
- \`path/to/file.ts\` — what changed and why

## Open items
- <new ideas, tech debt, or unresolved items surfaced during implementation>

For special implementations (large refactors, migrations, security changes), add extra sections AFTER the standard ones.
Be specific and detailed — this is the permanent implementation record. Do not include frontmatter.`;

export async function closePlan(
    input: ClosePlanInput,
    deps: ClosePlanDeps
): Promise<{ donePath: string; planId: string }> {
    const weaveId = await resolveWeaveIdForPlan(deps.loomRoot, input.planId);
    const weave = await deps.loadWeave(deps.loomRoot, weaveId);
    const plan = weave.threads.flatMap((t: any) => t.plans).find((p: PlanDoc) => p.id === input.planId) as PlanDoc | undefined;
    if (!plan) throw new Error(`Plan '${input.planId}' not found in weave '${weaveId}'.`);

    const thread = weave.threads.find((t: any) => t.plans.some((p: any) => p.id === input.planId)) as any;

    const stepLines = (plan.steps ?? [])
        .map(s => `${s.done ? '✅' : '⬜'} Step ${s.order}: ${s.description}`)
        .join('\n');

    const userMessage = [
        `Plan: ${plan.title} (${input.planId})`,
        `Status: ${plan.status}`,
        '',
        '=== Steps ===',
        stepLines || '(no steps)',
        ...(input.notes ? ['', '=== User notes ===', input.notes] : []),
    ].join('\n');

    const messages: Message[] = [
        { role: 'system', content: SYSTEM_PROMPT },
        { role: 'user', content: userMessage },
    ];

    const aiBody = await deps.aiClient.complete(messages);

    const weavePath = path.join(deps.loomRoot, 'loom', weaveId);
    const threadPath = thread ? path.join(weavePath, thread.id) : null;
    const doneDirPath = threadPath ? path.join(threadPath, 'done') : path.join(weavePath, 'done');
    await deps.fs.ensureDir(doneDirPath);

    const doneId = `${input.planId}-done`;
    const doneDoc: DoneDoc = {
        type: 'done',
        id: doneId,
        title: `Done — ${plan.title}`,
        status: 'done',
        created: new Date().toISOString().split('T')[0],
        version: 1,
        tags: [],
        parent_id: input.planId,
        requires_load: [],
        content: aiBody.trim(),
    };

    const donePath = path.join(doneDirPath, `${doneId}.md`);
    await deps.saveDoc(doneDoc, donePath);

    let updatedPlan = plan;
    if (plan.status === 'implementing') {
        updatedPlan = planReducer(plan, { type: 'FINISH_PLAN' });
    }

    if (threadPath) {
        // Thread plan: update in place; done doc is the separate record
        const planPath = (plan as any)._path ?? path.join(threadPath, 'plans', `${input.planId}.md`);
        await deps.saveDoc(updatedPlan, planPath);
    } else {
        // Flat/loose plan: move to done/
        const newPlanPath = path.join(doneDirPath, `${input.planId}.md`);
        await deps.saveDoc(updatedPlan, newPlanPath);
        const oldPlanPath = (plan as any)._path as string | undefined;
        if (oldPlanPath && await deps.fs.pathExists(oldPlanPath)) {
            await deps.fs.remove(oldPlanPath);
        }
    }

    return { donePath, planId: input.planId };
}
