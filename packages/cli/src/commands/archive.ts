import chalk from 'chalk';
import * as fs from 'fs-extra';
import { getActiveLoomRoot, resolveDocIdOrThrow } from '../../../fs/dist';
import { archiveItem, ArchiveInput } from '../../../app/dist/archive';

/**
 * `loom archive [weave] [thread]` — the CLI twin of loom_archive.
 * A thread is the atomic archive unit; `--doc <ulid>` archives a single
 * loom/refs doc (the one exception). Recoverable via `loom restore`.
 */
export async function archiveCommand(
    weave: string | undefined,
    thread: string | undefined,
    options: { doc?: string },
): Promise<void> {
    try {
        const input: ArchiveInput = options.doc
            ? { docUlid: options.doc }
            : (() => {
                if (!weave) throw new Error('Pass a <weave> (with optional <thread>) or --doc <ulid>.');
                return { weaveSlug: weave, threadSlug: thread };
            })();

        const result = await archiveItem(input, { getActiveLoomRoot, resolveDocIdOrThrow, fs });
        console.log(chalk.green(`📦 Archived.`));
        console.log(chalk.gray(`   ${JSON.stringify(result)}`));
    } catch (e: any) {
        console.error(chalk.red(`❌ ${e.message}`));
        process.exit(1);
    }
}
