import chalk from 'chalk';
import { weaveDesign } from '../../../app/dist/weaveDesign';
import { getActiveLoomRoot, saveDoc, loadDoc } from '../../../fs/dist';
import * as fs from 'fs-extra';
import { ensureThreadUlid } from '../threadArg';

export async function weaveDesignCommand(weaveId: string, options: { title?: string; thread?: string }): Promise<void> {
    try {
        const threadUlid = options.thread ? await ensureThreadUlid(weaveId, options.thread, options.title) : undefined;
        const result = await weaveDesign(
            { weaveSlug: weaveId, title: options.title, threadUlid },
            { getActiveLoomRoot, saveDoc, loadDoc, fs }
        );
        if (result.autoFinalized) {
            console.log(chalk.gray(`   Idea auto-finalized`));
        }
        console.log(chalk.green(`🧵 Design woven at ${result.filePath}`));
        console.log(chalk.gray(`   ID: ${result.id}`));
    } catch (e: any) {
        console.error(chalk.red(`❌ ${e.message}`));
        process.exit(1);
    }
}