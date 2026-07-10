import chalk from 'chalk';
import { execFileSync } from 'child_process';
import { getActiveLoomRoot } from '../../../fs/dist';
import { connectLocalMcp } from '../mcpClient';

interface ReleaseDate {
    version: string;
    date: string;
}

/**
 * Build the {version → tag-date} map from git tags on the *caller* side — the CLI
 * is the release pipeline here, and Loom's core/app never read git. Each `vX.Y.Z`
 * (or bare `X.Y.Z`) tag becomes `{ version, date }` from the tag's creation date.
 * The map is then fed into `loom_record_release` (backfill mode), which assigns
 * each done plan to the version whose date-range covers its done-date.
 */
function gitReleaseDates(root: string): ReleaseDate[] {
    const out = execFileSync(
        'git',
        ['-C', root, 'for-each-ref', '--sort=creatordate', '--format=%(refname:short)|%(creatordate:short)', 'refs/tags'],
        { encoding: 'utf8' }
    );
    const releases: ReleaseDate[] = [];
    for (const line of out.split('\n')) {
        const [tag, date] = line.split('|');
        if (!tag || !date) continue;
        const m = tag.trim().replace(/^v/i, '').match(/^(\d+\.\d+\.\d+)$/);
        if (!m) continue;
        releases.push({ version: m[1], date: date.trim() });
    }
    return releases;
}

export async function backfillReleasesCommand(options: { dryRun?: boolean; overwrite?: boolean }): Promise<void> {
    const root = getActiveLoomRoot();

    let releaseDates: ReleaseDate[];
    try {
        releaseDates = gitReleaseDates(root);
    } catch (e: any) {
        console.error(chalk.red(`❌ could not read git tags: ${e.message}`));
        process.exitCode = 1;
        return;
    }
    if (releaseDates.length === 0) {
        console.error(chalk.yellow('No X.Y.Z git tags found — nothing to backfill.'));
        return;
    }

    console.log(chalk.bold(`\n📦 ${releaseDates.length} release tag(s) found:`));
    for (const r of releaseDates) console.log(`  ${chalk.magenta('v' + r.version)}  ${chalk.gray(r.date)}`);

    if (options.dryRun) {
        console.log(chalk.gray('\n(dry-run — version/date map only, no plans stamped)\n'));
        return;
    }

    const client = await connectLocalMcp(root);
    try {
        const out = await client.callTool('loom_record_release', { releaseDates, overwrite: !!options.overwrite });
        const result = JSON.parse(out);
        console.log(chalk.bold(`\n✅ stamped ${result.stamped.length} plan(s), skipped ${result.skipped.length}`));
        for (const s of result.stamped) {
            console.log(`  ${chalk.magenta('v' + s.release)}  ${chalk.cyan(`${s.weaveSlug}/${s.threadSlug}`)}  ${chalk.gray(s.planId)}`);
        }
        const already = result.skipped.filter((s: any) => s.reason === 'already-stamped').length;
        const unshipped = result.skipped.filter((s: any) => s.reason === 'unshipped').length;
        if (already) console.log(chalk.gray(`  (${already} already stamped — pass --overwrite to restamp)`));
        if (unshipped) console.log(chalk.gray(`  (${unshipped} done after the last tag — left unversioned)`));
        console.log('');
    } catch (e: any) {
        console.error(chalk.red(`❌ ${e.message}`));
        process.exitCode = 1;
    } finally {
        await client.close();
    }
}
