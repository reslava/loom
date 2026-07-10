import chalk from 'chalk';
import { getActiveLoomRoot } from '../../../fs/dist';
import { connectLocalMcp } from '../mcpClient';

/**
 * `loom record-release <version>` — the release pipeline's hook into Loom. Stamps
 * `<version>` onto every done plan that has no release yet (live mode), so the
 * roadmap owns "what shipped in vX.Y.Z" without reading package.json/git.
 * Idempotent: a re-run finds nothing unstamped. This is the project-agnostic wire
 * — any project's pipeline (for Loom, the do-release runbook) calls it after tagging.
 */
export async function recordReleaseCommand(version: string, options: { overwrite?: boolean }): Promise<void> {
    const root = getActiveLoomRoot();
    const v = (version ?? '').replace(/^v/i, '');
    if (!/^\d+\.\d+\.\d+/.test(v)) {
        console.error(chalk.red(`❌ expected a version like 1.9.3, got '${version}'`));
        process.exitCode = 1;
        return;
    }

    const client = await connectLocalMcp(root);
    try {
        const out = await client.callTool('loom_record_release', { version: v, overwrite: !!options.overwrite });
        const result = JSON.parse(out);
        console.log(chalk.bold(`\n✅ stamped ${result.stamped.length} plan(s) with ${chalk.magenta('v' + v)}, skipped ${result.skipped.length}`));
        for (const s of result.stamped) {
            console.log(`  ${chalk.cyan(`${s.weaveSlug}/${s.threadSlug}`)}  ${chalk.gray(s.planId)}`);
        }
        const already = result.skipped.filter((s: any) => s.reason === 'already-stamped').length;
        if (already) console.log(chalk.gray(`  (${already} already carried a release — pass --overwrite to restamp)`));
        console.log('');
    } catch (e: any) {
        console.error(chalk.red(`❌ ${e.message}`));
        process.exitCode = 1;
    } finally {
        await client.close();
    }
}
