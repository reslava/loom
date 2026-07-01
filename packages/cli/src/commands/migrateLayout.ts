import chalk from 'chalk';
import * as fs from 'fs-extra';
import { getActiveLoomRoot, loadDoc } from '../../../fs/dist';
import { migrateLayout } from '../../../app/dist/migrateLayout';

/**
 * `loom migrate-layout` — normalise on-disk filenames to the canonical flat scheme
 * (idea.md, design.md, plan-NNN.md, plan-NNN-done.md, chat-NNN.md). Rename-only,
 * idempotent, collision-safe. Run with --dry-run first.
 */
export async function migrateLayoutCommand(options: { dryRun?: boolean }): Promise<void> {
    const deps = { getActiveLoomRoot, fs, loadDoc };
    try {
        const result = await migrateLayout({ dryRun: options.dryRun }, deps);
        const tag = result.dryRun ? chalk.yellow('[dry-run] ') : '';
        if (result.renames.length === 0) {
            console.log(chalk.green('✓ Layout already canonical — nothing to rename.'));
        } else {
            console.log(chalk.bold(`\n${tag}${result.dryRun ? 'Would rename' : 'Renamed'} ${result.renames.length} file(s):`));
            for (const r of result.renames) {
                console.log(`  ${chalk.cyan(r.from)} ${chalk.gray('→')} ${chalk.cyan(r.to)}`);
            }
        }
        if (result.skipped.length > 0) {
            console.log(chalk.yellow(`\n  ⚠ ${result.skipped.length} skipped:`));
            for (const s of result.skipped) console.log(`    ${chalk.gray(`${s.path}: ${s.reason}`)}`);
        }
    } catch (e: any) {
        console.error(chalk.red(`❌ ${e.message}`));
        process.exit(1);
    }
}
