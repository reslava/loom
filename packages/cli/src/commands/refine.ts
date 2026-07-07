import chalk from 'chalk';
import { runEvent } from '../../../app/dist/runEvent';
import { loadWeave} from '../../../fs/dist';
import { saveDocs } from '../../../fs/dist';
import { getActiveLoomRoot } from '../../../fs/dist';

export async function refineCommand(weaveSlug: string): Promise<void> {
    try {
        const loomRoot = getActiveLoomRoot();

        const loadWeaveOrThrow = async (root: string, tid: string) => {
            const thread = await loadWeave(root, tid);
            if (!thread) throw new Error(`Thread '${tid}' is empty or does not exist.`);
            return thread;
        };

        await runEvent(weaveSlug, { type: 'REFINE_DESIGN' }, { loadWeave: loadWeaveOrThrow, saveDocs, loomRoot });
        console.log(chalk.green(`🧵 REFINE_DESIGN applied to weave '${weaveSlug}'`));
        console.log(chalk.gray(`   Design version incremented. Dependent plans marked stale.`));
    } catch (e: any) {
        console.error(chalk.red(`❌ Failed to refine design: ${e.message}`));
        process.exit(1);
    }
}