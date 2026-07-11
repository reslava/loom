import chalk from 'chalk';
import * as readline from 'node:readline/promises';
import * as fs from 'fs-extra';
import { getActiveLoomRoot, resolveDocIdOrThrow } from '../../../fs/dist';
import { removeItem, RemoveInput } from '../../../app/dist/remove';

/** Prompt for a yes/no confirmation on an interactive TTY. Non-TTY → treated as "no". */
async function confirm(question: string): Promise<boolean> {
    if (!process.stdout.isTTY || !process.stdin.isTTY) return false;
    const rl = readline.createInterface({ input: process.stdin, output: process.stdout });
    try {
        const answer = (await rl.question(`${question} [y/N] `)).trim().toLowerCase();
        return answer === 'y' || answer === 'yes';
    } finally {
        rl.close();
    }
}

/**
 * `loom delete [weave] [thread]` — the CLI twin of loom_delete. Permanent and
 * irreversible (prefer `loom archive` for recoverable removal). Delete a doc by
 * `--doc <ulid>`, an archived refs doc by `--archived <rel-path>`, or a
 * thread/weave folder by slug. Guarded: prompts on a TTY unless `--yes`.
 */
export async function deleteCommand(
    weave: string | undefined,
    thread: string | undefined,
    options: { doc?: string; archived?: string; yes?: boolean },
): Promise<void> {
    try {
        const input: RemoveInput = options.archived
            ? { archivedRelPath: options.archived }
            : options.doc
            ? { docUlid: options.doc }
            : (() => {
                if (!weave) throw new Error('Pass a <weave> (with optional <thread>), --doc <ulid>, or --archived <rel-path>.');
                return { weaveSlug: weave, threadSlug: thread };
            })();

        const target = options.archived ?? options.doc ?? (thread ? `${weave}/${thread}` : weave);
        if (!options.yes) {
            const ok = await confirm(chalk.yellow(`Permanently delete ${chalk.bold(String(target))}? This cannot be undone.`));
            if (!ok) {
                console.log(chalk.gray('Aborted — nothing deleted. (pass --yes to skip this prompt)'));
                return;
            }
        }

        const result = await removeItem(input, { getActiveLoomRoot, resolveDocIdOrThrow, fs });
        console.log(chalk.green(`🗑️  Deleted.`));
        console.log(chalk.gray(`   ${JSON.stringify(result)}`));
    } catch (e: any) {
        console.error(chalk.red(`❌ ${e.message}`));
        process.exit(1);
    }
}
