import * as fs from 'fs-extra';
import * as path from 'path';
import { loadThread } from '../../fs/dist';
import { saveDoc } from '../../fs/dist';
import { generatePlanId } from '../../core/dist/idUtils';
import { createBaseFrontmatter } from '../../core/dist/frontmatterUtils';
import { generatePlanBody } from '../../core/dist/bodyGenerators/planBody';
import { DesignDoc, PlanDoc } from '../../core/dist';

export interface WeavePlanInput {
    threadId: string;
    title?: string;
    goal?: string;
}

export interface WeavePlanDeps {
    loomRoot: string;
    loadThread: (loomRoot: string, threadId: string) => Promise<any>;
    saveDoc: typeof saveDoc;
    fs: typeof fs;
}

export async function weavePlan(
    input: WeavePlanInput,
    deps: WeavePlanDeps
): Promise<{ id: string; filePath: string; autoFinalizedDesign: boolean }> {
    const threadPath = path.join(deps.loomRoot, 'threads', input.threadId);
    
    // Ensure the thread directory exists (zero‑friction)
    await deps.fs.ensureDir(threadPath);
    
    let thread;
    try {
        thread = await deps.loadThread(deps.loomRoot, input.threadId);
    } catch (e: any) {
        // Thread doesn't exist or has no documents—treat as empty
        thread = { design: undefined, plans: [] };
    }
    
    let design = thread.design;
    let autoFinalizedDesign = false;
    
    if (design && design.status !== 'done') {
        const updatedDesign: DesignDoc = {
            ...design,
            status: 'done',
            updated: new Date().toISOString().split('T')[0],
        };
        
        const designPath = (design as any)._path || path.join(threadPath, `${design.id}.md`);
        await deps.saveDoc(updatedDesign, designPath);
        
        design = updatedDesign;
        autoFinalizedDesign = true;
    }
    
    const planTitle = input.title || `${input.threadId} Plan`;
    const existingPlanIds = thread.plans?.map((p: any) => p.id) || [];
    const planId = generatePlanId(input.threadId, existingPlanIds);
    
    const baseFrontmatter = createBaseFrontmatter('plan', planId, planTitle, design?.id || null);
    
    const doc: PlanDoc = {
        ...baseFrontmatter,
        type: 'plan',
        status: 'draft',
        design_version: design?.version || 1,
        target_version: design?.target_release || '0.1.0',
        steps: [],
        content: generatePlanBody(planTitle, input.goal),
    } as PlanDoc;
    
    const plansDir = path.join(threadPath, 'plans');
    await deps.fs.ensureDir(plansDir);
    
    const filePath = path.join(plansDir, `${planId}.md`);
    await deps.saveDoc(doc, filePath);
    
    return { id: planId, filePath, autoFinalizedDesign };
}