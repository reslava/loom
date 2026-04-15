import chalk from 'chalk';
import { loadThread } from '../../../fs/dist/loadThread';
import { getActiveLoomRoot } from '../../../fs/dist/utils';
import * as fs from 'fs-extra';
import * as path from 'path';

interface ValidateOptions {
  all?: boolean;
  fix?: boolean;
  verbose?: boolean;
}

async function validateThread(threadId: string): Promise<{ id: string; issues: string[] }> {
  const thread = await loadThread(threadId);
  const issues: string[] = [];
  const allIds = new Set(thread.allDocs.map(d => d.id));

  if (!thread.design) {
    issues.push('Missing primary design document');
  } else if (thread.design.role !== 'primary') {
    issues.push('Design document must have role: primary');
  }

  for (const plan of thread.plans) {
    if (plan.design_version !== thread.design.version) {
      issues.push(`Plan ${plan.id} is stale (design v${thread.design.version}, plan expects v${plan.design_version})`);
    }
    if (plan.staled && plan.design_version === thread.design.version) {
      issues.push(`Plan ${plan.id} marked stale but design version matches`);
    }
  }

  for (const doc of thread.allDocs) {
    if (doc.parent_id && !allIds.has(doc.parent_id)) {
      issues.push(`Broken parent_id: ${doc.id} → ${doc.parent_id}`);
    }
  }

  for (const doc of thread.allDocs) {
    for (const childId of doc.child_ids || []) {
      if (!allIds.has(childId)) {
        issues.push(`Dangling child_id: ${doc.id} → ${childId}`);
      }
    }
  }

  return { id: threadId, issues };
}

export async function validateCommand(threadId?: string, options?: ValidateOptions): Promise<void> {
  const loomRoot = getActiveLoomRoot();
  const threadsDir = path.join(loomRoot, 'threads');

  if (threadId) {
    const { issues } = await validateThread(threadId);
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
          results.push(await validateThread(entry));
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