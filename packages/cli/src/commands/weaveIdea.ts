import chalk from 'chalk';
import { weaveIdea } from '../../../app/dist';
import { getActiveLoomRoot, saveDoc } from '../../../fs/dist';
import * as fs from 'fs-extra';

export async function weaveIdeaCommand(title: string, options: { thread?: string }): Promise<void> {
    try {
        const result = await weaveIdea(
            { title, thread: options.thread },
            { getActiveLoomRoot, saveDoc, fs }
        );
        console.log(chalk.green(`🧵 Idea woven at ${result.filePath}`));
        console.log(chalk.gray(`   Temporary ID: ${result.tempId}`));
        console.log(chalk.gray(`   Run 'loom finalize ${result.tempId}' when the title is final.`));
    } catch (e: any) {
        console.error(chalk.red(`❌ ${e.message}`));
        process.exit(1);
    }
}