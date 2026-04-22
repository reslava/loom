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
    const weavePath = path.join(deps.loomRoot, 'weaves', input.weaveId);
    
    // Ensure the weave directory exists (zero‑friction)
    await deps.fs.ensureDir(weavePath);
    
    // Load existing weave or create empty one
    let weave = await deps.loadWeave(deps.loomRoot, input.weaveId);
    if (!weave) {
        weave = { id: input.weaveId, ideas: [], designs: [], plans: [], contexts: [], allDocs: [] };
    }
    
    const planTitle = input.title || `${input.weaveId} Plan`;
    const existingPlanIds = weave.plans.map((p: any) => p.id);
    const planId = generatePlanId(input.weaveId, existingPlanIds);
    
    const baseFrontmatter = createBaseFrontmatter('plan', planId, planTitle, null); // No parent required
    
    const doc: PlanDoc = {
        ...baseFrontmatter,
        type: 'plan',
        status: 'draft',
        design_version: 1, // Default when no design exists
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