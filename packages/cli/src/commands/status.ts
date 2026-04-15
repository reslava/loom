import chalk from 'chalk';
import { loadThread } from '../../../fs/dist/loadThread';
import { getThreadStatus, getThreadPhase } from '../../../core/dist/derived';
import { getActiveLoomRoot } from '../../../fs/dist/utils';
import * as fs from 'fs-extra';
import * as path from 'path';

function colorStatus(status: string): string {
  switch (status) {
    case 'DONE': return chalk.green(status);
    case 'IMPLEMENTING': return chalk.blue(status);
    case 'ACTIVE': return chalk.yellow(status);
    case 'CANCELLED': return chalk.red(status);
    default: return status;
  }
}

export async function statusCommand(threadId?: string, options?: { verbose?: boolean; json?: boolean; tokens?: boolean }): Promise<void> {
  const loomRoot = getActiveLoomRoot();
  const threadsDir = path.join(loomRoot, 'threads');

  if (threadId) {
    // Single thread status
    try {
      const thread = await loadThread(threadId);
      const status = getThreadStatus(thread);
      const phase = getThreadPhase(thread);
      
      if (options?.json) {
        console.log(JSON.stringify({
          id: thread.id,
          status,
          phase,
          designVersion: thread.design.version,
          planCount: thread.plans.length,
          plans: thread.plans.map(p => ({
            id: p.id,
            status: p.status,
            staled: p.staled || false,
            stepsDone: p.steps?.filter(s => s.done).length || 0,
            stepsTotal: p.steps?.length || 0,
          })),
        }, null, 2));
        return;
      }

      console.log(chalk.bold(`\n🧵 Thread: ${thread.id}`));
      console.log(`   Status: ${colorStatus(status)}`);
      console.log(`   Phase:  ${phase}`);
      console.log(`   Design: ${thread.design.title} (v${thread.design.version})`);
      console.log(`   Plans:  ${thread.plans.length} (${thread.plans.filter(p => p.status === 'done').length} done)`);
      
      if (options?.verbose) {
        for (const plan of thread.plans) {
          const doneSteps = plan.steps?.filter(s => s.done).length || 0;
          const totalSteps = plan.steps?.length || 0;
          const staleMark = plan.staled ? chalk.yellow(' ⚠️ stale') : '';
          console.log(`     - ${plan.id}: ${plan.status} (${doneSteps}/${totalSteps} steps)${staleMark}`);
        }
      }

      // Show next actionable step if any plan is implementing
      const activePlan = thread.plans.find(p => p.status === 'implementing' || p.status === 'active');
      if (activePlan?.steps) {
        const nextStep = activePlan.steps.find(s => !s.done);
        if (nextStep) {
          console.log(chalk.gray(`\n   💡 Next step: Step ${nextStep.order} — ${nextStep.description}`));
        }
      }
    } catch (e: any) {
      console.error(chalk.red(`❌ Thread '${threadId}' not found or invalid: ${e.message}`));
      process.exit(1);
    }
  } else {
    // List all threads
    if (!fs.existsSync(threadsDir)) {
      console.log(chalk.yellow('No threads found.'));
      console.log(chalk.gray(`  Create a thread with 'loom weave idea "Your Idea"'`));
      return;
    }

    const entries = await fs.readdir(threadsDir);
    const threads: any[] = [];
    
    for (const entry of entries) {
      const threadPath = path.join(threadsDir, entry);
      const stat = await fs.stat(threadPath);
      if (stat.isDirectory() && entry !== '_archive') {
        try {
          const thread = await loadThread(entry);
          threads.push({
            id: entry,
            status: getThreadStatus(thread),
            phase: getThreadPhase(thread),
          });
        } catch {
          threads.push({ id: entry, status: 'INVALID', phase: 'unknown' });
        }
      }
    }

    if (options?.json) {
      console.log(JSON.stringify(threads, null, 2));
      return;
    }

    if (threads.length === 0) {
      console.log(chalk.yellow('No threads found.'));
      return;
    }

    console.log(chalk.bold('\n🧵 Threads\n'));
    for (const t of threads) {
      console.log(`  ${t.id.padEnd(25)} ${colorStatus(t.status)}`);
    }
  }
}