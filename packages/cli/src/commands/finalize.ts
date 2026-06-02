import chalk from 'chalk';
import { finalize } from '../../../app/dist';
import { loadDoc, saveDoc, getActiveLoomRoot, findDocumentById } from '../../../fs/dist';

export async function finalizeCommand(tempId: string): Promise<void> {
    try {
        const result = await finalize(
            { tempId },
            { loadDoc, saveDoc, getActiveLoomRoot, findDocumentById }
        );

        console.log(chalk.green(`✅ Document finalized (status: active).`));
        console.log(chalk.gray(`   ID (unchanged): ${result.id}`));
        console.log(chalk.gray(`   Path: ${result.newPath}`));
    } catch (e: any) {
        console.error(chalk.red(`❌ ${e.message}`));
        process.exit(1);
    }
}