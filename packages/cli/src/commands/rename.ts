import chalk from 'chalk';
import { rename } from '../../../app/dist';
import { loadDoc, saveDoc, getActiveLoomRoot, findDocumentById } from '../../../fs/dist';

export async function renameCommand(oldId: string, newTitle: string): Promise<void> {
    try {
        const result = await rename(
            { oldId, newTitle },
            { loadDoc, saveDoc, getActiveLoomRoot, findDocumentById }
        );

        console.log(chalk.green(`✅ Document renamed.`));
        console.log(chalk.green(`   Title: ${result.title}`));
        console.log(chalk.gray(`   ID (unchanged): ${result.id}`));
    } catch (e: any) {
        console.error(chalk.red(`❌ ${e.message}`));
        process.exit(1);
    }
}