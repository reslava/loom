import { loadDoc } from '../../fs/dist';
import { findMarkdownFiles } from '../../fs/dist';
import { LinkIndex } from '../../core/dist/linkIndex';
import { Document } from '../../core/dist/entities/document';
import { DesignDoc } from '../../core/dist/entities/design';
import { PlanDoc } from '../../core/dist/entities/plan';
import {
    validateParentExists,
    getDanglingChildIds,
    validateStepBlockers
} from '../../core/dist/validation';
import * as fs from 'fs-extra';
import * as path from 'path';

export interface ValidateInput {
    weaveId?: string;
    all?: boolean;
    verbose?: boolean;
}

export interface ValidateDeps {
    getActiveLoomRoot: (wsRoot?: string) => string;
    buildLinkIndex: (loomRoot: string) => Promise<LinkIndex>;
    loadDoc: typeof loadDoc;
    fs: typeof fs;
    loomRoot: string;
}

export interface ValidationResult {
    id: string;
    issues: string[];
}

async function validateWeave(
    weaveId: string,
    index: LinkIndex,
    loomRoot: string,
    deps: Pick<ValidateDeps, 'loadDoc' | 'fs'>
): Promise<ValidationResult> {
    const issues: string[] = [];
    const weavePath = path.join(loomRoot, 'loom', weaveId);
    
    if (!await deps.fs.pathExists(weavePath)) {
        return { id: weaveId, issues: ['Weave directory not found'] };
    }

    const docs: Document[] = [];
    const files = await findMarkdownFiles(weavePath);
    
    for (const file of files) {
        try {
            const doc = await deps.loadDoc(file) as Document;
            docs.push(doc);
        } catch (e) {
            issues.push(`Failed to load ${path.relative(loomRoot, file)}: ${(e as Error).message}`);
        }
    }

    if (docs.length === 0) {
        return { id: weaveId, issues: ['Weave is empty'] };
    }

    for (const doc of docs) {
        if (doc.parent_id && !validateParentExists(doc, index)) {
            issues.push(`Broken parent_id: ${doc.id} → ${doc.parent_id}`);
        }

        const dangling = getDanglingChildIds(doc, index);
        for (const childId of dangling) {
            issues.push(`Dangling child_id: ${doc.id} → ${childId}`);
        }

        if (doc.type === 'plan') {
            const plan = doc as PlanDoc;
            
            if (plan.parent_id) {
                const parentDesign = docs.find(d => d.id === plan.parent_id) as DesignDoc;
                if (parentDesign && plan.design_version !== parentDesign.version) {
                    issues.push(`Plan ${plan.id} is stale (design v${parentDesign.version}, plan expects v${plan.design_version})`);
                }
            }

            const blockerIssues = validateStepBlockers(plan, index);
            issues.push(...blockerIssues.map(i => i.message));
        }
    }

    return { id: weaveId, issues };
}

export async function validate(
    input: ValidateInput,
    deps: ValidateDeps
): Promise<{ results: ValidationResult[]; index: LinkIndex }> {
    const loomRoot = deps.getActiveLoomRoot(deps.loomRoot);
    const weavesDir = path.join(loomRoot, 'loom');
    const index = await deps.buildLinkIndex(loomRoot);
    const results: ValidationResult[] = [];

    if (input.weaveId) {
        const result = await validateWeave(input.weaveId, index, loomRoot, deps);
        results.push(result);
    } else if (input.all) {
        const entries = await deps.fs.readdir(weavesDir);
        for (const entry of entries) {
            const weavePath = path.join(weavesDir, entry);
            const stat = await deps.fs.stat(weavePath);
            if (stat.isDirectory() && entry !== '.archive') {
                try {
                    results.push(await validateWeave(entry, index, loomRoot, deps));
                } catch {
                    results.push({ id: entry, issues: ['Failed to load weave'] });
                }
            }
        }
    } else {
        throw new Error('Specify a weave ID or use --all to validate all weaves.');
    }

    return { results, index };
}