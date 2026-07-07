import chalk from 'chalk';
import { getActiveLoomRoot } from '../../../fs/dist';
import { connectLocalMcp } from '../mcpClient';
import { resolvePlanUlid } from '../planArg';

/**
 * `loom next [plan]` — print the next incomplete step + context for a plan.
 *
 * Thin delivery shim over the do-next-step prompt. The friendly `[plan]` arg is
 * resolved to a `pl_` ULID at the CLI edge (see resolvePlanUlid) so the prompt
 * receives the strict ULID it now requires; when omitted, the workspace's active
 * plan is used.
 */
export async function nextCommand(plan?: string): Promise<void> {
    try {
        const planUlid = await resolvePlanUlid(plan);
        if (!planUlid) {
            console.log(chalk.yellow('No active plan found. Pass a plan explicitly: loom next <plan>'));
            return;
        }

        const root = getActiveLoomRoot();
        const client = await connectLocalMcp(root);
        try {
            const out = await client.getPrompt('do-next-step', { planUlid });
            console.log(out);
        } finally {
            await client.close();
        }
    } catch (e: any) {
        console.error(chalk.red(`❌ ${e.message}`));
        process.exit(1);
    }
}
