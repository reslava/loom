import chalk from 'chalk';
import { weavePlan } from '../../../app/dist/weavePlan';
import { loadWeave, saveDoc, loadDoc } from '../../../fs/dist';
import { getActiveLoomRoot } from '../../../fs/dist';
import * as fs from 'fs-extra';
import { ensureThreadUlid } from '../threadArg';

export async function weavePlanCommand(weaveId: string, options: { title?: string; goal?: string; thread?: string }): Promise<void> {
    try {
        const loomRoot = getActiveLoomRoot();
        const threadUlid = options.thread ? await ensureThreadUlid(weaveId, options.thread, options.title) : undefined;
        const result = await weavePlan(
            { weaveSlug: weaveId, title: options.title, goal: options.goal, threadUlid },
            { loadWeave, saveDoc, loadDoc, fs, loomRoot }
        );
        console.log(chalk.green(`🧵 Plan woven at ${result.filePath}`));
        console.log(chalk.gray(`   ID: ${result.id}`));
    } catch (e: any) {
        console.error(chalk.red(`❌ ${e.message}`));
        process.exit(1);
    }
}