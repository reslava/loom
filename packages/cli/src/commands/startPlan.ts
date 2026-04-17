import chalk from 'chalk';
import { runEvent } from '../../../app/dist/runEvent';
import { loadThread as loadThreadFs, saveThread } from '../../../fs/dist';

// Helper to bind dependencies for runEvent
const runEventWithDeps = (threadId: string, event: any) => 
    runEvent(threadId, event, { loadThread: loadThreadFs, saveThread });

export async function startPlanCommand(planId: string): Promise<void> {
    try {
        const threadId = planId.split('-plan-')[0];
        if (!threadId) {
            throw new Error(`Invalid plan ID format. Expected "{threadId}-plan-###", got "${planId}"`);
        }

        const thread = await loadThreadFs(threadId);
        const plan = thread.plans.find(p => p.id === planId);
        
        if (!plan) {
            throw new Error(`Plan '${planId}' not found in thread '${threadId}'`);
        }

        if (plan.status === 'draft') {
            await runEventWithDeps(threadId, { type: 'ACTIVATE_PLAN', planId });
            console.log(chalk.gray(`   Plan activated (draft → active)`));
        }

        await runEventWithDeps(threadId, { type: 'START_IMPLEMENTING_PLAN', planId });
        console.log(chalk.green(`🧵 START_PLAN applied to '${planId}'`));
        console.log(chalk.gray(`   Plan status changed to implementing.`));
    } catch (e: any) {
        console.error(chalk.red(`❌ Failed to start plan: ${e.message}`));
        process.exit(1);
    }
}