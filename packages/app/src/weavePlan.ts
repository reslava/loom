import * as fs from 'fs-extra';
import * as path from 'path';
import { loadWeave } from '../../fs/dist';
import { saveDoc, loadDoc } from '../../fs/dist';
import { generateDocId, generatePlanId } from '../../core/dist/idUtils';
import { createBaseFrontmatter } from '../../core/dist/frontmatterUtils';
import { generatePlanBody } from '../../core/dist/bodyGenerators/planBody';
import { PlanDoc, DesignDoc, PlanStep } from '../../core/dist';

export interface WeavePlanInput {
    weaveId: string;
    title?: string;
    goal?: string;
    steps?: string[];
    parentId?: string;
    threadId?: string;
}

export interface WeavePlanDeps {
    loadWeave: (loomRoot: string, weaveId: string) => Promise<any>;
    saveDoc: typeof saveDoc;
    loadDoc: typeof loadDoc;
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

        // Filename uses thread-scoped counter: {threadId}-plan-NNN
        const existingFiles = await deps.fs.readdir(plansDir).catch(() => [] as string[]);
        const existingPlanIds = existingFiles
            .filter(f => f.endsWith('.md'))
            .map(f => f.replace(/\.md$/, ''));

        const planTitle = input.title || `${input.threadId} Plan`;
        const planFilename = generatePlanId(input.threadId, existingPlanIds);
        const planId = generateDocId('plan');

        // Resolve parent from the design's actual frontmatter id (not a convention string).
        let parentId: string | null = input.parentId ?? null;
        if (!parentId) {
            const designPath = path.join(threadPath, `${input.threadId}-design.md`);
            if (await deps.fs.pathExists(designPath).catch(() => false)) {
                const design = await deps.loadDoc(designPath) as DesignDoc;
                parentId = design.id;
            }
        }

        const planSteps: PlanStep[] = (input.steps ?? []).map((s, i) => ({
            order: i + 1, description: s, done: false, files_touched: [], blockedBy: [],
        }));
        const baseFrontmatter = createBaseFrontmatter('plan', planId, planTitle, parentId);
        const doc: PlanDoc = {
            ...baseFrontmatter,
            type: 'plan',
            status: 'active',
            design_version: 1,
            target_version: '0.1.0',
            steps: planSteps,
            content: generatePlanBody(planTitle, input.goal, input.steps),
        } as PlanDoc;

        const filePath = path.join(plansDir, `${planFilename}.md`);
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
    const planFilename = generatePlanId(input.weaveId, existingPlanIds);
    const planId = generateDocId('plan');

    const planSteps: PlanStep[] = (input.steps ?? []).map((s, i) => ({
        order: i + 1, description: s, done: false, files_touched: [], blockedBy: [],
    }));
    const baseFrontmatter = createBaseFrontmatter('plan', planId, planTitle, input.parentId ?? null);
    const doc: PlanDoc = {
        ...baseFrontmatter,
        type: 'plan',
        status: 'draft',
        design_version: 1,
        target_version: '0.1.0',
        steps: planSteps,
        content: generatePlanBody(planTitle, input.goal, input.steps),
    } as PlanDoc;

    const plansDir = path.join(weavePath, 'plans');
    await deps.fs.ensureDir(plansDir);
    const filePath = path.join(plansDir, `${planFilename}.md`);
    await deps.saveDoc(doc, filePath);
    return { id: planId, filePath };
}
