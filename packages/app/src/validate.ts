import { loadDoc, getActiveLoomRoot } from '../../fs/dist';
import { buildLinkIndex } from '../../fs/dist';
import { LinkIndex } from '../../core/dist/linkIndex';
import { Document, DesignDoc, PlanDoc } from '../../core/dist/types';
import * as fs from 'fs-extra';
import * as path from 'path';

export interface ValidateInput {
    threadId?: string;
    all?: boolean;
    verbose?: boolean;
}

export interface ValidateDeps {
    getActiveLoomRoot: typeof getActiveLoomRoot;
    buildLinkIndex: typeof buildLinkIndex;
    loadDoc: typeof loadDoc;
    fs: typeof fs;
}

export interface ValidationResult {
    id: string;
    issues: string[];
}

// Inline validation helpers
function validateParentExists(doc: Document, index: LinkIndex): boolean {
    if (!doc.parent_id) return true;
    return index.documents.has(doc.parent_id);
}

function getDanglingChildIds(doc: Document, index: LinkIndex): string[] {
    if (!doc.child_ids) return [];
    return doc.child_ids.filter(id => !index.documents.has(id));
}

function validateDesignRole(doc: DesignDoc): string | null {
    if (!doc.role) {
        return 'Design missing role field (should be "primary" or "supporting")';
    }
    if (doc.role !== 'primary' && doc.role !== 'supporting') {
        return `Invalid role "${doc.role}" (must be "primary" or "supporting")`;
    }
    return null;
}

function validateStepBlockers(plan: PlanDoc, index: LinkIndex): string[] {
    const issues: string[] = [];
    if (!plan.steps) return issues;
    
    for (const step of plan.steps) {
        if (!step.blockedBy) continue;
        
        for (const blocker of step.blockedBy) {
            if (blocker.startsWith('Step ')) {
                const stepNum = parseInt(blocker.replace('Step ', ''), 10);
                if (isNaN(stepNum) || stepNum < 1 || stepNum > plan.steps.length) {
                    issues.push(`Step ${step.order}: invalid blocker "${blocker}"`);
                }
                continue;
            }
            
            if (blocker.includes('-plan-')) {
                if (!index.documents.has(blocker)) {
                    issues.push(`Step ${step.order}: blocked by missing plan "${blocker}"`);
                }
                continue;
            }
            
            issues.push(`Step ${step.order}: unknown blocker format "${blocker}"`);
        }
    }
    
    return issues;
}

async function findMarkdownFiles(dir: string): Promise<string[]> {
    const result: string[] = [];
    const entries = await fs.readdir(dir, { withFileTypes: true });
    
    for (const entry of entries) {
        const fullPath = path.join(dir, entry.name);
        if (entry.isDirectory() && entry.name !== '_archive') {
            result.push(...await findMarkdownFiles(fullPath));
        } else if (entry.isFile() && entry.name.endsWith('.md')) {
            result.push(fullPath);
        }
    }
    
    return result;
}

async function validateThread(
    threadId: string,
    index: LinkIndex,
    loomRoot: string,
    deps: Pick<ValidateDeps, 'loadDoc' | 'fs'>
): Promise<ValidationResult> {
    const issues: string[] = [];
    const threadPath = path.join(loomRoot, 'threads', threadId);
    
    if (!await deps.fs.pathExists(threadPath)) {
        return { id: threadId, issues: ['Thread directory not found'] };
    }

    const docs: Document[] = [];
    const files = await findMarkdownFiles(threadPath);
    
    for (const file of files) {
        try {
            const doc = await deps.loadDoc(file) as Document;
            docs.push(doc);
        } catch (e) {
            issues.push(`Failed to load ${path.relative(loomRoot, file)}: ${(e as Error).message}`);
        }
    }

    const primaryDesign = docs.find(d => d.type === 'design' && (d as DesignDoc).role === 'primary');
    
    if (!primaryDesign) {
        issues.push('Missing primary design document');
        return { id: threadId, issues };
    }

    for (const doc of docs) {
        if (doc.parent_id && !validateParentExists(doc, index)) {
            issues.push(`Broken parent_id: ${doc.id} → ${doc.parent_id}`);
        }

        const dangling = getDanglingChildIds(doc, index);
        for (const childId of dangling) {
            issues.push(`Dangling child_id: ${doc.id} → ${childId}`);
        }

        if (doc.type === 'design') {
            const roleIssue = validateDesignRole(doc as DesignDoc);
            if (roleIssue) {
                issues.push(roleIssue);
            }
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
            issues.push(...blockerIssues);
        }
    }

    return { id: threadId, issues };
}

export async function validate(
    input: ValidateInput,
    deps: ValidateDeps
): Promise<{ results: ValidationResult[]; index: LinkIndex }> {
    const loomRoot = deps.getActiveLoomRoot();
    const threadsDir = path.join(loomRoot, 'threads');
    const index = await deps.buildLinkIndex();
    const results: ValidationResult[] = [];

    if (input.threadId) {
        const result = await validateThread(input.threadId, index, loomRoot, deps);
        results.push(result);
    } else if (input.all) {
        const entries = await deps.fs.readdir(threadsDir);
        for (const entry of entries) {
            const threadPath = path.join(threadsDir, entry);
            const stat = await deps.fs.stat(threadPath);
            if (stat.isDirectory() && entry !== '_archive') {
                try {
                    results.push(await validateThread(entry, index, loomRoot, deps));
                } catch {
                    results.push({ id: entry, issues: ['Failed to load thread'] });
                }
            }
        }
    } else {
        throw new Error('Specify a thread ID or use --all to validate all threads.');
    }

    return { results, index };
}