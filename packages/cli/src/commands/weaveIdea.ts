import chalk from 'chalk';
import * as fs from 'fs-extra';
import { getActiveLoomRoot, saveDoc } from '../../../fs/dist';
import { toKebabCaseId } from '../../../core/dist';
import { weaveIdea } from '../../../app/dist/weaveIdea';

export async function weaveIdeaCommand(title: string, options: { weave?: string; thread?: string }): Promise<void> {
    try {
        const loomRoot = getActiveLoomRoot();
        // Every doc lives in a thread: default the thread to a kebab of the title
        // (a new idea starts a new thread) when one isn't given explicitly.
        const threadId = options.thread ?? toKebabCaseId(title);
        const result = await weaveIdea(
            { title, weave: options.weave, threadId },
            { getActiveLoomRoot, saveDoc, fs }
        );
        console.log(chalk.green(`🧵 Idea woven at ${result.filePath}`));
        console.log(chalk.gray(`   ID: ${result.id}`));
    } catch (e: any) {
        console.error(chalk.red(`❌ ${e.message}`));
        process.exit(1);
    }
}
