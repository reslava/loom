import chalk from 'chalk';
import * as fs from 'fs-extra';
import { getActiveLoomRoot, loadWeave, saveDoc, saveDocs, loadDoc } from '../../../fs/dist';
import { resolveThreadUlid } from '../../../app/dist/utils/resolveThreadFolder';
import { quickShip } from '../../../app/dist/quickShip';

/**
 * `loom quick-ship <weave> [thread]` — the CLI twin of loom_quick_ship. Records
 * already-done work as one fresh DONE plan (roadmap history + release key). Each
 * repeatable `--step "<desc>"` becomes one done step (`--steps-file <json>` for a
 * JSON array escape hatch). Target an existing thread (positional) or mint one
 * with `--new-thread <slug>`. Do the work first — this only records it.
 */
export async function quickShipCommand(
    weave: string,
    thread: string | undefined,
    options: { step?: string[]; stepsFile?: string; notes?: string; newThread?: string; newThreadTitle?: string },
): Promise<void> {
    try {
        const loomRoot = getActiveLoomRoot();

        let steps: string[] = options.step ?? [];
        if (options.stepsFile) {
            const parsed = JSON.parse(await fs.readFile(options.stepsFile, 'utf8'));
            if (!Array.isArray(parsed)) throw new Error('--steps-file must contain a JSON array of strings.');
            steps = steps.concat(parsed.map(String));
        }
        if (steps.length === 0) throw new Error('Pass at least one --step "<done work>" (or --steps-file <json>).');
        const description: string | string[] = steps.length === 1 ? steps[0] : steps;

        let threadUlid: string | undefined;
        let newThread: { slug: string; title?: string } | undefined;
        if (thread) {
            threadUlid = await resolveThreadUlid(weave, thread, { getActiveLoomRoot, loadDoc, fs });
        } else if (options.newThread) {
            newThread = { slug: options.newThread, title: options.newThreadTitle };
        } else {
            throw new Error('Pass an existing <thread>, or --new-thread <slug> to mint one.');
        }

        const loadWeaveStrict = async (root: string, w: string) => {
            const result = await loadWeave(root, w);
            if (!result) throw new Error(`Weave not found: ${w}`);
            return result;
        };

        const result = await quickShip(
            { weaveSlug: weave, threadUlid, newThread, description, notes: options.notes },
            { loadWeave: loadWeaveStrict, saveDoc, saveDocs, loadDoc, fs, loomRoot },
        );
        console.log(chalk.green(`🚢 Quick-shipped a done plan.`));
        console.log(chalk.gray(`   ${JSON.stringify(result)}`));
    } catch (e: any) {
        console.error(chalk.red(`❌ ${e.message}`));
        process.exit(1);
    }
}
