import chalk from 'chalk';
import * as fs from 'fs-extra';
import { getActiveLoomRoot, loadWeave, buildLinkIndex, saveDoc, loadDoc, ConfigRegistry } from '../../../fs/dist';
import { backfillStalenessBaselines } from '../../../app/dist/backfillStalenessBaselines';

/**
 * `loom backfill-staleness-baselines` — one-time migration onto the directional,
 * version-based staleness model: stamp `idea_version` on designs, `design_version`
 * on reqs, and repoint each req's parent from the idea to the design. Idempotent.
 */
export async function backfillStalenessBaselinesCommand(options: { dryRun?: boolean }): Promise<void> {
    const registry = new ConfigRegistry();
    const deps = { getActiveLoomRoot, loadWeave, buildLinkIndex, registry, fs, saveDoc, loadDoc };
    try {
        const result = await backfillStalenessBaselines({ dryRun: options.dryRun }, deps);
        const tag = result.dryRun ? chalk.yellow('[dry-run] ') : '';
        if (result.changed.length === 0) {
            console.log(chalk.green(`✓ Every design/req baseline is already current (${result.scanned} scanned).`));
        } else {
            console.log(chalk.bold(`\n${tag}${result.dryRun ? 'Would update' : 'Updated'} ${result.changed.length} baseline field(s):`));
            for (const c of result.changed) {
                console.log(`  ${chalk.cyan(c.path)}  ${chalk.gray(`${c.field}: ${c.from ?? '—'} → ${c.to}`)}`);
            }
            console.log(chalk.gray(`  (${result.scanned} design/req doc(s) scanned)`));
        }
        if (result.failed.length > 0) {
            console.log(chalk.yellow(`  ⚠ ${result.failed.length} doc(s) could not be read:`));
            for (const f of result.failed) console.log(`    ${chalk.gray(`${f.path}: ${f.error}`)}`);
        }
    } catch (e: any) {
        console.error(chalk.red(`❌ ${e.message}`));
        process.exit(1);
    }
}
