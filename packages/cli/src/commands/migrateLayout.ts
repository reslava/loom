import * as path from 'path';
import chalk from 'chalk';
import * as fs from 'fs-extra';
import { getActiveLoomRoot, loadDoc } from '../../../fs/dist';
import { migrateLayout, MigrateLayoutResult } from '../../../app/dist/migrateLayout';

/**
 * `loom migrate-layout` — normalise on-disk filenames to the canonical flat scheme
 * (idea.md, design.md, plan-NNN.md, plan-NNN-done.md, chat-NNN.md). Rename-only,
 * idempotent, collision-aware (legacy plans/dones sharing an ordinal are auto-
 * renumbered, never overwritten). Run with --dry-run first. Every run writes an
 * audit log (collisions + full rename list) to a gitignored path.
 */

async function writeLog(root: string, result: MigrateLayoutResult): Promise<string> {
    // `.loom/cache/` is gitignored in every Loom install → repo-agnostic, and the log
    // never pollutes the migration's "renames only" diff.
    const logPath = path.join(root, '.loom', 'cache', 'migrate-layout.log');
    const lines: string[] = [];
    lines.push(`# migrate-layout ${result.dryRun ? '(dry-run) ' : ''}— ${new Date().toISOString()}`);
    lines.push(`renames: ${result.renames.length} · collisions resolved: ${result.collisions.length} · skipped: ${result.skipped.length}`, '');

    if (result.collisions.length) {
        lines.push('## Collisions auto-renumbered');
        for (const c of result.collisions) {
            lines.push(`- ${c.dir} — ${c.members.length} ${c.kind} docs contended for ordinal ${c.contested}:`);
            for (const m of c.members) lines.push(`    ${m.from} → ${m.to}${m.keptDesired ? '  (kept)' : '  (renumbered)'}`);
        }
        lines.push('');
    }

    lines.push(`## Renames (${result.renames.length})`);
    for (const r of result.renames) lines.push(`  ${r.from} → ${r.to}`);

    if (result.skipped.length) {
        lines.push('', `## Skipped (${result.skipped.length})`);
        for (const s of result.skipped) lines.push(`  ${s.path}: ${s.reason}`);
    }

    await fs.ensureDir(path.dirname(logPath));
    await fs.writeFile(logPath, lines.join('\n') + '\n');
    return logPath;
}

export async function migrateLayoutCommand(options: { dryRun?: boolean }): Promise<void> {
    const root = getActiveLoomRoot();
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

        if (result.collisions.length > 0) {
            console.log(chalk.magenta(`\n  ⚠ ${result.collisions.length} collision(s) auto-renumbered (nothing overwritten):`));
            for (const c of result.collisions) {
                const names = c.members.map(m => path.basename(m.to)).join(', ');
                console.log(`    ${chalk.gray(c.dir)}: ${c.members.length} ${c.kind}s @${c.contested} → ${names}`);
            }
        }

        if (result.skipped.length > 0) {
            console.log(chalk.yellow(`\n  ⚠ ${result.skipped.length} skipped:`));
            for (const s of result.skipped) console.log(`    ${chalk.gray(`${s.path}: ${s.reason}`)}`);
        }

        const logPath = await writeLog(root, result);
        console.log(chalk.gray(`\n  ↳ audit log: ${path.relative(root, logPath).split(path.sep).join('/')}`));
    } catch (e: any) {
        console.error(chalk.red(`❌ ${e.message}`));
        process.exit(1);
    }
}
