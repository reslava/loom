import chalk from 'chalk';
import * as fs from 'fs-extra';
import { getActiveLoomRoot } from '../../../fs/dist';
import { restoreItem, RestoreInput } from '../../../app/dist/restore';

/**
 * `loom restore [weave] [thread]` — the CLI twin of loom_restore (inverse of
 * archive). Restore a thread/weave folder by slug, or a single archived doc by
 * `--archived <rel-path>` (its path relative to loom/.archive/).
 */
export async function restoreCommand(
    weave: string | undefined,
    thread: string | undefined,
    options: { archived?: string },
): Promise<void> {
    try {
        const input: RestoreInput = options.archived
            ? { archivedRelPath: options.archived }
            : (() => {
                if (!weave) throw new Error('Pass a <weave> (with optional <thread>) or --archived <rel-path>.');
                return { weaveSlug: weave, threadSlug: thread };
            })();

        const result = await restoreItem(input, { getActiveLoomRoot, fs });
        console.log(chalk.green(`♻️  Restored.`));
        console.log(chalk.gray(`   ${JSON.stringify(result)}`));
    } catch (e: any) {
        console.error(chalk.red(`❌ ${e.message}`));
        process.exit(1);
    }
}
