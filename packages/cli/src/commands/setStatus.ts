import chalk from 'chalk';
import { setStatus } from '../../../app/dist';
import { loadDoc, saveDoc, getActiveLoomRoot, findDocumentById, resolveDocIdOrThrow } from '../../../fs/dist';

/**
 * `loom set-status <doc> <status>` — the CLI twin of loom_set_status.
 * `<doc>` is a human ref (slug / filename stem / ULID); it is resolved to the
 * canonical id at the CLI edge, then the guarded set-status use-case applies the
 * label change (or refuses a transition a dedicated tool owns).
 */
export async function setStatusCommand(doc: string, status: string): Promise<void> {
    try {
        const loomRoot = getActiveLoomRoot();
        const { id } = await resolveDocIdOrThrow(loomRoot, doc);
        const result = await setStatus(
            { docUlid: id, status },
            { loadDoc, saveDoc, getActiveLoomRoot, findDocumentById }
        );
        console.log(chalk.green(`✅ Status set to '${result.status}'.`));
        console.log(chalk.gray(`   Doc:  ${result.id}`));
        console.log(chalk.gray(`   Path: ${result.filePath}`));
    } catch (e: any) {
        console.error(chalk.red(`❌ ${e.message}`));
        process.exit(1);
    }
}
