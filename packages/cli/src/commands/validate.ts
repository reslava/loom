import chalk from 'chalk';
import * as fs from 'fs-extra';
import * as path from 'path';
import { getActiveLoomRoot } from '../../../fs/dist';
import { buildLinkIndex } from '../../../fs/dist';
import { loadDoc } from '../../../fs/dist';
import { findMarkdownFiles } from '../../../fs/dist';
import { Document, DesignDoc, PlanDoc } from '../../../core/dist';
import {
    validateParentExists,
    getDanglingChildIds,
    validateDesignRole,
    validateStepBlockers,
    ValidationIssue
} from '../../../core/dist/validation';

interface ValidateOptions {
    all?: boolean;
    fix?: boolean;
    verbose?: boolean;
}

async function validateThreadWithIndex(
    threadId: string,
    index: ReturnType<typeof buildLinkIndex> extends Promise<infer T> ? T : never,
    loomRoot: string
): Promise<{ id: string; issues: string[] }> {
    const issues: string[] = [];
    const threadPath = path.join(loomRoot, 'threads', threadId);
    
    if (!await fs.pathExists(threadPath)) {
        return { id: threadId, issues: ['Thread directory not found'] };
    }

    const docs: Document[] = [];
    const files = await findMarkdownFiles(threadPath);
    
    for (const file of files) {
        try {
            const doc = await loadDoc(file) as Document;
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
                issues.push(roleIssue.message);
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
            issues.push(...blockerIssues.map(i => i.message));
        }
    }

    return { id: threadId, issues };
}

export async function validateCommand(threadId?: string, options?: ValidateOptions): Promise<void> {
    const loomRoot = getActiveLoomRoot();
    const threadsDir = path.join(loomRoot, 'threads');

    console.log(chalk.gray('Building link index...'));
    const index = await buildLinkIndex();
    console.log(chalk.gray(`Indexed ${index.documents.size} documents.\n`));

    if (threadId) {
        const { issues } = await validateThreadWithIndex(threadId, index, loomRoot);
        if (issues.length === 0) {
            console.log(chalk.green(`✅ Thread '${threadId}' is valid`));
        } else {
            console.log(chalk.red(`❌ Thread '${threadId}' has issues:`));
            issues.forEach(i => console.log(`   - ${i}`));
        }
        process.exit(issues.length > 0 ? 1 : 0);
    }

    if (options?.all) {
        const entries = await fs.readdir(threadsDir);
        const results: { id: string; issues: string[] }[] = [];
        
        for (const entry of entries) {
            const threadPath = path.join(threadsDir, entry);
            const stat = await fs.stat(threadPath);
            if (stat.isDirectory() && entry !== '_archive') {
                try {
                    results.push(await validateThreadWithIndex(entry, index, loomRoot));
                } catch {
                    results.push({ id: entry, issues: ['Failed to load thread'] });
                }
            }
        }

        const valid = results.filter(r => r.issues.length === 0);
        const invalid = results.filter(r => r.issues.length > 0);

        console.log(chalk.bold('\n🔍 Validation Summary\n'));
        for (const r of valid) {
            console.log(`  ${chalk.green('✅')} ${r.id}`);
        }
        for (const r of invalid) {
            console.log(`  ${chalk.red('❌')} ${r.id} (${r.issues.length} issues)`);
        }
        
        if (options?.verbose) {
            for (const r of invalid) {
                console.log(chalk.yellow(`\n  ${r.id}:`));
                r.issues.forEach(i => console.log(`    - ${i}`));
            }
        }

        process.exit(invalid.length > 0 ? 1 : 0);
    }

    console.log(chalk.yellow('Specify a thread ID or use --all to validate all threads.'));
}