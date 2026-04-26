import * as fs from 'fs-extra';
import * as path from 'path';
import { loadWeave } from '../../fs/dist';
import { saveDoc } from '../../fs/dist';
import { generatePlanId } from '../../core/dist/idUtils';
import { createBaseFrontmatter } from '../../core/dist/frontmatterUtils';
import { generatePlanBody } from '../../core/dist/bodyGenerators/planBody';
import { PlanDoc } from '../../core/dist';

export interface WeavePlanInput {
    weaveId: string;
    title?: string;
    goal?: string;
    parentId?: string;
    threadId?: string;
}

export interface WeavePlanDeps {
    loadWeave: (loomRoot: string, weaveId: string) => Promise<any>;
    saveDoc: typeof saveDoc;
    fs: typeof fs;
    loomRoot: string;
}

export async function weavePlan(
    input: WeavePlanInput,
    deps: WeavePlanDeps
): Promise<{ id: string; filePath: string }> {
    const weavePath = path.join(deps.loomRoot, 'loom', input.weaveId);

    if (input.threadId) {
        const threadPath = path.join(weavePath, input.threadId);
        const plansDir = path.join(threadPath, 'plans');
        await deps.fs.ensureDir(plansDir);

        // Plan IDs use weaveId prefix so use-cases can recover weaveId via planId.split('-plan-')[0]
        const existingWeave = await deps.loadWeave(deps.loomRoot, input.weaveId).catch(() => null);
        const existingPlanIds: string[] = existingWeave
            ? existingWeave.threads.flatMap((t: any) => t.plans.map((p: any) => p.id))
            : [];

        const planTitle = input.title || `${input.threadId} Plan`;
        const planId = generatePlanId(input.weaveId, existingPlanIds);

        let parentId: string | null = input.parentId ?? null;
        if (!parentId) {
            const designPath = path.join(threadPath, `${input.threadId}-design.md`);
            const designExists = await deps.fs.pathExists(designPath).catch(() => false);
            if (designExists) parentId = `${input.threadId}-design`;
        }

        const baseFrontmatter = createBaseFrontmatter('plan', planId, planTitle, parentId);
        const doc: PlanDoc = {
            ...baseFrontmatter,
            type: 'plan',
            status: 'draft',
            design_version: 1,
            target_version: '0.1.0',
            steps: [],
            content: generatePlanBody(planTitle, input.goal),
        } as PlanDoc;

        const filePath = path.join(plansDir, `${planId}.md`);
        await deps.saveDoc(doc, filePath);
        return { id: planId, filePath };
    }

    await deps.fs.ensureDir(weavePath);
    let weave = await deps.loadWeave(deps.loomRoot, input.weaveId);
    if (!weave) {
        weave = { id: input.weaveId, threads: [], looseFibers: [], chats: [], allDocs: [] };
    }

    const planTitle = input.title || `${input.weaveId} Plan`;
    const existingPlanIds = weave.threads.flatMap((t: any) => t.plans.map((p: any) => p.id));
    const planId = generatePlanId(input.weaveId, existingPlanIds);

    const baseFrontmatter = createBaseFrontmatter('plan', planId, planTitle, input.parentId ?? null);
    const doc: PlanDoc = {
        ...baseFrontmatter,
        type: 'plan',
        status: 'draft',
        design_version: 1,
        target_version: '0.1.0',
        steps: [],
        content: generatePlanBody(planTitle, input.goal),
    } as PlanDoc;

    const plansDir = path.join(weavePath, 'plans');
    await deps.fs.ensureDir(plansDir);
    const filePath = path.join(plansDir, `${planId}.md`);
    await deps.saveDoc(doc, filePath);
    return { id: planId, filePath };
}