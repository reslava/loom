import chalk from 'chalk';
import * as fs from 'fs-extra';
import { migratePlanSteps, MigrateStatus } from '../../../app/dist/migratePlanSteps';
import { loadDoc, saveDoc, getActiveLoomRoot } from '../../../fs/dist';

const LABEL: Record<MigrateStatus, string> = {
    'migrated': chalk.green('migrated'),
    'already-native': chalk.gray('already-native'),
    'unparseable': chalk.red('unparseable'),
    'no-steps': chalk.yellow('no-steps'),
};

export async function migratePlanStepsCommand(
    docId: string | undefined,
    options: { dryRun?: boolean },
): Promise<void> {
    try {
        const loomRoot = getActiveLoomRoot();
        const results = await migratePlanSteps(
            { loomRoot, dryRun: options.dryRun, docId },
            { loadDoc, saveDoc, fs },
        );

        if (results.length === 0) {
            console.log(chalk.yellow(docId ? `No plan matching "${docId}" found.` : 'No plan documents found.'));
            return;
        }

        const verb = options.dryRun ? 'Would migrate' : 'Migrating';
        console.log(chalk.bold(`\n🧵 ${verb} plan steps → frontmatter${options.dryRun ? ' (dry run)' : ''}\n`));

        for (const r of results) {
            const stem = r.filePath.replace(/^.*[\\/]loom[\\/]/, 'loom/');
            const count = r.status === 'migrated' || r.status === 'already-native' ? chalk.gray(` (${r.stepCount} steps)`) : '';
            console.log(`  ${LABEL[r.status].padEnd(24)} ${stem}${count}`);
        }

        const counts = results.reduce((acc, r) => { acc[r.status] = (acc[r.status] ?? 0) + 1; return acc; }, {} as Record<string, number>);
        const summary = (Object.entries(counts) as [MigrateStatus, number][])
            .map(([s, n]) => `${n} ${s}`)
            .join(', ');
        console.log(chalk.bold(`\n  ${summary}`));

        if (counts['unparseable']) {
            console.log(chalk.red(`\n  ⚠️  ${counts['unparseable']} plan(s) have a Steps table the parser could not read — left untouched. Fix the table by hand, then re-run.`));
        }
        if (options.dryRun && counts['migrated']) {
            console.log(chalk.gray(`\n  Re-run without --dry-run to apply.`));
        }
    } catch (e: any) {
        console.error(chalk.red(`❌ ${e.message}`));
        process.exit(1);
    }
}
