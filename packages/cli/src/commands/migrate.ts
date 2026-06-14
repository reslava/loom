import chalk from 'chalk';
import * as fs from 'fs-extra';
import { getActiveLoomRoot, saveDoc, loadDoc } from '../../../fs/dist';
import { backfillThreadManifests } from '../../../app/dist/migrateThreads';

/**
 * `loom migrate` — run registered Loom migrations. v1 registers exactly one,
 * `backfill-thread-manifests`, which creates a `thread.md` for every thread
 * lacking one. Idempotent and `--dry-run` capable; ships in the binary so any
 * upgrading install (here or downstream) can backfill the roadmap manifests.
 */
export async function migrateCommand(options: { dryRun?: boolean }): Promise<void> {
    try {
        const result = await backfillThreadManifests(
            { dryRun: options.dryRun },
            { getActiveLoomRoot, saveDoc, loadDoc, fs },
        );

        const tag = result.dryRun ? chalk.yellow('[dry-run] ') : '';
        if (result.created.length === 0) {
            console.log(chalk.green(`✓ Every thread already has a thread.md (${result.skipped.length} present).`));
            return;
        }

        console.log(chalk.bold(`\n${tag}${result.dryRun ? 'Would create' : 'Created'} ${result.created.length} thread manifest(s):`));
        for (const c of result.created) {
            console.log(`  ${chalk.cyan(`${c.weaveId}/${c.threadId}`)}${c.id ? `  ${chalk.gray(c.id)}` : ''}`);
        }
        console.log(chalk.gray(`  (${result.skipped.length} already present)`));
    } catch (e: any) {
        console.error(chalk.red(`❌ ${e.message}`));
        process.exit(1);
    }
}
