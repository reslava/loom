import chalk from 'chalk';
import * as fs from 'fs-extra';
import { getActiveLoomRoot, loadWeave, buildLinkIndex } from '../../../fs/dist';
import { ConfigRegistry } from '../../../core/dist';
import { getBlockedSteps } from '../../../app/dist';

/**
 * `loom blocked` — list blocked steps across implementing plans, printing the step
 * + its blockers.
 *
 * Thin delivery shim over the app `getBlockedSteps` use-case (the single source of
 * truth the loom_get_blocked_steps MCP tool also uses).
 */
export async function blockedCommand(): Promise<void> {
    try {
        const registry = new ConfigRegistry();
        const blocked = await getBlockedSteps({ getActiveLoomRoot, loadWeave, buildLinkIndex, registry, fs });

        if (blocked.length === 0) {
            console.log(chalk.green('✓ No blocked steps.'));
            return;
        }

        console.log(chalk.bold(`\n🔒 ${blocked.length} blocked step(s)\n`));
        for (const b of blocked) {
            console.log(`  ${chalk.cyan(b.planId)}  step ${b.stepNumber}: ${b.stepDescription}`);
            console.log(`     ${chalk.yellow(`blocked by: ${b.blockedBy.join(', ') || '(unspecified)'}`)}`);
        }
    } catch (e: any) {
        console.error(chalk.red(`❌ ${e.message}`));
        process.exit(1);
    }
}
