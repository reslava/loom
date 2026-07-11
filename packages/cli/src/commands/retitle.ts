import chalk from 'chalk';
import { rename } from '../../../app/dist';
import { loadDoc, saveDoc, getActiveLoomRoot, findDocumentById } from '../../../fs/dist';

/**
 * `loom retitle <doc> <new-title>` — the CLI twin of loom_retitle. Changes a
 * document's **title** only; the ULID `id` and every cross-reference (by ULID)
 * are untouched. (Was `loom rename`; the `rename` verb now owns folder/file
 * slug renames, mirroring loom_rename_thread/weave/reference_file.)
 */
export async function retitleCommand(oldId: string, newTitle: string): Promise<void> {
    try {
        const result = await rename(
            { oldId, newTitle },
            { loadDoc, saveDoc, getActiveLoomRoot, findDocumentById }
        );
        console.log(chalk.green(`✅ Document retitled.`));
        console.log(chalk.green(`   Title: ${result.title}`));
        console.log(chalk.gray(`   ID (unchanged): ${result.id}`));
    } catch (e: any) {
        console.error(chalk.red(`❌ ${e.message}`));
        process.exit(1);
    }
}
