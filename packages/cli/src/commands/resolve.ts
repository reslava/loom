import chalk from 'chalk';
import * as fs from 'fs-extra';
import { getActiveLoomRoot, loadDoc } from '../../../fs/dist';
import { resolveThreadUlid, resolveThreadFolder } from '../../../app/dist/utils/resolveThreadFolder';

/**
 * `loom resolve-ulid <weave> <slug>` — turn a human thread folder slug into the
 * stable `th_` ULID the API contract wants (the inverse direction the CLI's
 * create commands do implicitly). Prints the ULID.
 */
export async function resolveUlidCommand(weaveSlug: string, threadSlug: string): Promise<void> {
    try {
        const deps = { getActiveLoomRoot, loadDoc, fs };
        const ulid = await resolveThreadUlid(weaveSlug, threadSlug, deps);
        console.log(ulid);
    } catch (e: any) {
        console.error(chalk.red(`❌ ${e.message}`));
        process.exit(1);
    }
}

/**
 * `loom resolve-path <weave> <ulid>` — turn a thread's `th_` ULID into its folder
 * (slug + absolute path). The human-readable inverse of the ULID contract.
 */
export async function resolvePathCommand(weaveSlug: string, threadUlid: string): Promise<void> {
    try {
        const deps = { getActiveLoomRoot, loadDoc, fs };
        const { threadSlug, threadPath } = await resolveThreadFolder(weaveSlug, threadUlid, deps);
        console.log(`${weaveSlug}/${threadSlug}`);
        console.log(chalk.gray(threadPath));
    } catch (e: any) {
        console.error(chalk.red(`❌ ${e.message}`));
        process.exit(1);
    }
}
