import chalk from 'chalk';
import * as fs from 'fs-extra';
import { getActiveLoomRoot, loadWeave, saveDoc } from '../../../fs/dist';
import { closePlan } from '../../../app/dist/closePlan';
import { resolvePlanUlid } from '../planArg';

/**
 * `loom close-plan <plan>` — the CLI twin of loom_close_plan. Runs the
 * FINISH_PLAN transition on a plan whose steps are all done. `--notes` is
 * written verbatim into the done doc (required if no done doc exists yet).
 */
export async function closePlanCommand(plan: string, options: { notes?: string }): Promise<void> {
    try {
        const loomRoot = getActiveLoomRoot();
        const planUlid = await resolvePlanUlid(plan);
        if (!planUlid) throw new Error(`Could not resolve '${plan}' to a plan.`);

        const loadWeaveStrict = async (root: string, w: string) => {
            const weave = await loadWeave(root, w);
            if (!weave) throw new Error(`Weave not found: ${w}`);
            return weave;
        };

        const result = await closePlan(
            { planUlid, notes: options.notes },
            { loadWeave: loadWeaveStrict, saveDoc, fs, loomRoot },
        );
        console.log(chalk.green(`✅ Plan closed: ${planUlid}`));
        console.log(chalk.gray(`   ${JSON.stringify(result)}`));
    } catch (e: any) {
        console.error(chalk.red(`❌ ${e.message}`));
        process.exit(1);
    }
}
