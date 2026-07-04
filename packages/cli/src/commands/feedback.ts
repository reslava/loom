import chalk from 'chalk';
import * as os from 'os';
import { exec } from 'child_process';
import { getState, getFeedbackContext } from '../../../app/dist';
import { getActiveLoomRoot, loadWeave, buildLinkIndex, resolveFeedbackRepo, ConfigRegistry } from '../../../fs/dist';
import * as fs from 'fs-extra';

const pkg = require('../../package.json');

/** Best-effort cross-platform browser open — dependency-free (the URL is always printed too). */
function openUrl(url: string): void {
    const cmd = process.platform === 'win32' ? `start "" "${url}"`
        : process.platform === 'darwin' ? `open "${url}"`
        : `xdg-open "${url}"`;
    exec(cmd, () => { /* ignore — the URL was already printed as a fallback */ });
}

export async function feedbackCommand(options?: { repo?: string; print?: boolean }): Promise<void> {
    try {
        const registry = new ConfigRegistry();
        const ctx = await getFeedbackContext(
            { loomVersion: pkg.version, repoOverride: options?.repo, cwd: process.cwd() },
            {
                getState: () => getState({ getActiveLoomRoot, loadWeave, buildLinkIndex, registry, fs }),
                resolveFeedbackRepo,
                platform: () => os.platform(),
            },
        );

        if (!ctx.url) {
            console.error(chalk.red('❌ Could not resolve a target repo for feedback.'));
            console.error(chalk.gray('   Pass one with `loom feedback --repo owner/name`, or add a GitHub `origin` remote.'));
            process.exit(1);
        }

        console.log(chalk.bold('\n🧵 Send Loom feedback'));
        console.log(chalk.gray(`   Repo:     ${ctx.repo}`));
        console.log(chalk.gray(`   Snapshot: ${ctx.snapshot.weaveCount} weaves, ${ctx.snapshot.threadCount} threads, ${ctx.snapshot.donePlanCount} done plans (v${ctx.snapshot.currentRelease ?? 'n/a'}) — you can edit it before sending`));
        console.log('');
        console.log(ctx.url);
        console.log('');

        if (options?.print) return;
        console.log(chalk.gray('   Opening your browser…'));
        openUrl(ctx.url);
    } catch (e: any) {
        console.error(chalk.red(`❌ ${e.message}`));
        process.exit(1);
    }
}
