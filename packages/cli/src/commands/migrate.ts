import chalk from 'chalk';
import * as fs from 'fs-extra';
import { getActiveLoomRoot, saveDoc, loadDoc } from '../../../fs/dist';
import { backfillThreadManifests } from '../../../app/dist/migrateThreads';
import { normalizeDates } from '../../../app/dist/normalizeDates';

/**
 * `loom migrate` — run registered Loom migrations. Idempotent and `--dry-run`
 * capable; ships in the binary so any upgrading install (here or downstream) can
 * run them. Registered migrations:
 *   - `backfill-thread-manifests` — create a `thread.md` for every thread lacking one.
 *   - `normalize-dates` — rewrite non-canonical (e.g. full-ISO) `created`/`updated`
 *     dates to canonical `YYYY-MM-DD`. Hygiene only; `toEpoch` already orders mixed
 *     formats correctly, so this is not a correctness dependency.
 */
export async function migrateCommand(options: { dryRun?: boolean }): Promise<void> {
    const deps = { getActiveLoomRoot, saveDoc, loadDoc, fs };
    try {
        // Migration 1: backfill thread manifests.
        const result = await backfillThreadManifests({ dryRun: options.dryRun }, deps);
        const tag = result.dryRun ? chalk.yellow('[dry-run] ') : '';
        if (result.created.length === 0) {
            console.log(chalk.green(`✓ Every thread already has a thread.md (${result.skipped.length} present).`));
        } else {
            console.log(chalk.bold(`\n${tag}${result.dryRun ? 'Would create' : 'Created'} ${result.created.length} thread manifest(s):`));
            for (const c of result.created) {
                console.log(`  ${chalk.cyan(`${c.weaveId}/${c.threadId}`)}${c.id ? `  ${chalk.gray(c.id)}` : ''}`);
            }
            console.log(chalk.gray(`  (${result.skipped.length} already present)`));
        }

        // Migration 2: normalize doc dates to canonical YYYY-MM-DD.
        const dates = await normalizeDates({ dryRun: options.dryRun }, deps);
        const dtag = dates.dryRun ? chalk.yellow('[dry-run] ') : '';
        if (dates.changed.length === 0) {
            console.log(chalk.green(`✓ All dates already canonical (${dates.scanned} docs scanned).`));
        } else {
            console.log(chalk.bold(`\n${dtag}${dates.dryRun ? 'Would normalize' : 'Normalized'} ${dates.changed.length} date field(s):`));
            for (const c of dates.changed) {
                console.log(`  ${chalk.cyan(c.path)}  ${chalk.gray(`${c.field}: ${c.from} → ${c.to}`)}`);
            }
        }
        if (dates.failed.length > 0) {
            console.log(chalk.yellow(`  ⚠ ${dates.failed.length} doc(s) could not be read:`));
            for (const f of dates.failed) console.log(`    ${chalk.gray(`${f.path}: ${f.error}`)}`);
        }
    } catch (e: any) {
        console.error(chalk.red(`❌ ${e.message}`));
        process.exit(1);
    }
}
