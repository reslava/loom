import chalk from 'chalk';
import { summarise } from '../../../app/dist/summarise';
import { loadThread } from '../../../fs/dist/loadThread';
import { getActiveLoomRoot } from '../../../fs/dist/utils';
import * as fs from 'fs-extra';

export async function summariseCommand(threadId: string, options: { force?: boolean }): Promise<void> {
    try {
        const result = await summarise(
            { threadId, force: options.force },
            { loadThread, getActiveLoomRoot, fs }
        );

        if (result.generated) {
            console.log(chalk.green(`🧵 Context summary generated at ${result.ctxPath}`));
        } else {
            console.log(chalk.yellow(`⚠️  Context summary is already up to date`));
            console.log(chalk.gray(`   Use --force to regenerate.`));
        }
    } catch (e: any) {
        console.error(chalk.red(`❌ Failed to summarise context: ${e.message}`));
        process.exit(1);
    }
}