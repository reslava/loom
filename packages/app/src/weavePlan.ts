import * as fs from 'fs-extra';
import * as path from 'path';
import { loadWeave } from '../../fs/dist';
import { saveDoc, loadDoc } from '../../fs/dist';
import { generateDocId, generatePlanId } from '../../core/dist/idUtils';
import { createBaseFrontmatter } from '../../core/dist/frontmatterUtils';
import { PlanDoc, DesignDoc, PlanStep, serializePlanBody, slugifyStepId } from '../../core/dist';
import { lockedReqVersion } from './req';

/** One structured step as supplied to create a plan. `title`/`detail` seed the body
 *  view (`### Step N` sections) but are not persisted to frontmatter (body owns prose). */
export interface PlanStepInput {
    description: string;
    title?: string;
    files?: string[];
    blockedBy?: string[];
    satisfies?: string[];
    detail?: string;
}

export interface WeavePlanInput {
    weaveId: string;
    title?: string;
    goal?: string;
    /** Structured ordered steps. The plan is born frontmatter-native (Loom owns the table). */
    steps?: PlanStepInput[];
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

/** Build canonical PlanSteps from structured create input (born frontmatter-native). */
function buildStructuredSteps(stepsInput: PlanStepInput[]): PlanStep[] {
    const taken = new Set<string>();
    return stepsInput.map((s, i) => {
        const description = s.description ?? '';
        const title = (s.title && s.title.trim()) ? s.title.trim() : description;
        return {
            id: slugifyStepId(title || description, taken),
            order: i + 1,
            status: 'pending' as const,
            title,
            description,
            files_touched: s.files ?? [],
            blockedBy: s.blockedBy ?? [],
            satisfies: s.satisfies ?? [],
            ...(s.detail && s.detail.trim() ? { detail: s.detail } : {}),
        };
    });
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

        const planSteps: PlanStep[] = buildStructuredSteps(input.steps ?? []);
        const body = serializePlanBody(planSteps, { goal: input.goal });
        const baseFrontmatter = createBaseFrontmatter('plan', planId, planTitle, parentId);
        // Stamp the locked req version this plan was built against (req-staleness baseline).
        const reqV = await lockedReqVersion(deps.loomRoot, input.weaveId, input.threadId, { loadDoc: deps.loadDoc, fs: deps.fs });
        const doc: PlanDoc = {
            ...baseFrontmatter,
            type: 'plan',
            status: 'active',
            design_version: 1,
            target_version: '0.1.0',
            steps: planSteps,
            content: body,
            ...(reqV !== undefined ? { req_version: reqV } : {}),
        } as PlanDoc;
        // Plans are born frontmatter-native so the saver persists the steps block.
        (doc as any)._stepsFromFrontmatter = true;

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

    const planSteps: PlanStep[] = buildStructuredSteps(input.steps ?? []);
    const body = serializePlanBody(planSteps, { goal: input.goal });
    const baseFrontmatter = createBaseFrontmatter('plan', planId, planTitle, input.parentId ?? null);
    const doc: PlanDoc = {
        ...baseFrontmatter,
        type: 'plan',
        status: 'draft',
        design_version: 1,
        target_version: '0.1.0',
        steps: planSteps,
        content: body,
    } as PlanDoc;
    (doc as any)._stepsFromFrontmatter = true;

    const plansDir = path.join(weavePath, 'plans');
    await deps.fs.ensureDir(plansDir);
    const filePath = path.join(plansDir, `${planFilename}.md`);
    await deps.saveDoc(doc, filePath);
    return { id: planId, filePath };
}
