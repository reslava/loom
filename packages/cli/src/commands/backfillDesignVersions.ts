import chalk from 'chalk';
import * as fs from 'fs-extra';
import { getActiveLoomRoot, saveDoc, loadDoc } from '../../../fs/dist';
import { backfillDesignVersions } from '../../../app/dist/backfillDesignVersions';

/**
 * `loom backfill-design-versions` — one-time repair of plan `design_version` baselines
 * that were stamped before create/promote read the live design version. Re-stamps each
 * plan to its parent thread design's current version. Idempotent; `--dry-run` previews.
 */
export async function backfillDesignVersionsCommand(options: { dryRun?: boolean }): Promise<void> {
    const deps = { getActiveLoomRoot, saveDoc, loadDoc, fs };
    try {
        const result = await backfillDesignVersions({ dryRun: options.dryRun }, deps);
        const tag = result.dryRun ? chalk.yellow('[dry-run] ') : '';
        if (result.changed.length === 0) {
            console.log(chalk.green(`✓ Every plan's design_version already matches its design (${result.scanned} plan(s) scanned).`));
        } else {
            console.log(chalk.bold(`\n${tag}${result.dryRun ? 'Would re-baseline' : 'Re-baselined'} ${result.changed.length} plan(s):`));
            for (const c of result.changed) {
                console.log(`  ${chalk.cyan(c.path)}  ${chalk.gray(`design_version: ${c.from ?? '—'} → ${c.to}`)}`);
            }
            console.log(chalk.gray(`  (${result.scanned} plan(s) scanned)`));
        }
        if (result.failed.length > 0) {
            console.log(chalk.yellow(`  ⚠ ${result.failed.length} plan(s) could not be read:`));
            for (const f of result.failed) console.log(`    ${chalk.gray(`${f.path}: ${f.error}`)}`);
        }
    } catch (e: any) {
        console.error(chalk.red(`❌ ${e.message}`));
        process.exit(1);
    }
}
