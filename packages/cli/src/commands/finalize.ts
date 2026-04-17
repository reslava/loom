import chalk from 'chalk';
import { finalize } from '../../../app/dist/finalize';
import { loadDoc, saveDoc, getActiveLoomRoot, findDocumentById, gatherAllDocumentIds } from '../../../fs/dist';
import * as fs from 'fs-extra';

export async function finalizeCommand(tempId: string): Promise<void> {
    try {
        const result = await finalize(
            { tempId },
            { loadDoc, saveDoc, getActiveLoomRoot, findDocumentById, gatherAllDocumentIds, fs }
        );

        console.log(chalk.green(`✅ Document finalized.`));
        console.log(chalk.gray(`   Old ID: ${result.oldId}`));
        console.log(chalk.green(`   New ID: ${result.newId}`));
        console.log(chalk.gray(`   Path: ${result.newPath}`));
    } catch (e: any) {
        console.error(chalk.red(`❌ ${e.message}`));
        process.exit(1);
    }
}