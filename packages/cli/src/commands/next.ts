import chalk from 'chalk';
import * as fs from 'fs-extra';
import { getActiveLoomRoot, loadWeave, buildLinkIndex } from '../../../fs/dist';
import { ConfigRegistry } from '../../../fs/dist';
import { getState } from '../../../app/dist';
import { connectLocalMcp } from '../mcpClient';

/**
 * Resolve the workspace's active plan id: the first plan in status "implementing",
 * else the first in status "active". Returns undefined if none exists.
 */
async function resolveActivePlanId(): Promise<string | undefined> {
    const registry = new ConfigRegistry();
    const state = await getState({ getActiveLoomRoot, loadWeave, buildLinkIndex, registry, fs });
    const plans = state.weaves.flatMap((w) => w.threads.flatMap((t) => t.plans));
    return (
        plans.find((p) => p.status === 'implementing')?.id ??
        plans.find((p) => p.status === 'active')?.id
    );
}

/**
 * `loom next [plan-id]` — print the next incomplete step + context for a plan.
 *
 * Thin delivery shim over the do-next-step prompt. When plan-id is omitted, the
 * workspace's active plan (implementing, then active) is resolved and used.
 */
export async function nextCommand(planId?: string): Promise<void> {
    try {
        const resolved = planId ?? (await resolveActivePlanId());
        if (!resolved) {
            console.log(chalk.yellow('No active plan found. Pass a plan id explicitly: loom next <plan-id>'));
            return;
        }

        const root = getActiveLoomRoot();
        const client = await connectLocalMcp(root);
        try {
            const out = await client.getPrompt('do-next-step', { planUlid: resolved });
            console.log(out);
        } finally {
            await client.close();
        }
    } catch (e: any) {
        console.error(chalk.red(`❌ ${e.message}`));
        process.exit(1);
    }
}
