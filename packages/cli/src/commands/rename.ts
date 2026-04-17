import chalk from 'chalk';
import { rename } from '../../../app/dist/rename';
import { loadDoc, saveDoc, getActiveLoomRoot, findDocumentById, gatherAllDocumentIds, findMarkdownFiles } from '../../../fs/dist';
import * as fs from 'fs-extra';

export async function renameCommand(oldId: string, newTitle: string): Promise<void> {
    try {
        const result = await rename(
            { oldId, newTitle },
            { loadDoc, saveDoc, getActiveLoomRoot, findDocumentById, gatherAllDocumentIds, findMarkdownFiles, fs }
        );

        console.log(chalk.green(`✅ Document renamed.`));
        console.log(chalk.gray(`   Old ID: ${result.oldId}`));
        console.log(chalk.green(`   New ID: ${result.newId}`));
        console.log(chalk.gray(`   Updated ${result.updatedCount} reference(s).`));
    } catch (e: any) {
        console.error(chalk.red(`❌ ${e.message}`));
        process.exit(1);
    }
}