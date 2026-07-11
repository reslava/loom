import chalk from 'chalk';
import * as fs from 'fs-extra';
import { getActiveLoomRoot, loadDoc, saveDoc, resolveDocIdOrThrow } from '../../../fs/dist';
import { resolveThreadUlid } from '../../../app/dist/utils/resolveThreadFolder';
import { renameThread } from '../../../app/dist/thread';
import { renameWeave as renameWeaveUseCase } from '../../../app/dist/weave';
import { renameDocFile } from '../../../app/dist/renameDocFile';

function fail(e: any): never {
    console.error(chalk.red(`❌ ${e.message}`));
    process.exit(1);
}

/**
 * The `loom rename <thing>` namespace — CLI twins of loom_rename_thread /
 * loom_rename_weave / loom_rename_reference_file. These rename a folder/file
 * **slug**; a document *title* change is `loom retitle`. Mirrors the
 * `loom create <type>` namespace shape (the CLI is human-first).
 */
export async function renameThreadCommand(weave: string, thread: string, newSlug: string): Promise<void> {
    try {
        const threadUlid = await resolveThreadUlid(weave, thread, { getActiveLoomRoot, loadDoc, fs });
        const result = await renameThread(
            { weaveSlug: weave, threadUlid, newThreadSlug: newSlug },
            { getActiveLoomRoot, loadDoc, fs },
        );
        console.log(chalk.green(`🧵 Thread renamed: ${weave}/${thread} → ${weave}/${newSlug}`));
        console.log(chalk.gray(`   ${JSON.stringify(result)}`));
    } catch (e) { fail(e); }
}

export async function renameWeaveCommand(slug: string, newSlug: string): Promise<void> {
    try {
        const result = await renameWeaveUseCase(
            { weaveSlug: slug, newWeaveSlug: newSlug },
            { getActiveLoomRoot, fs },
        );
        console.log(chalk.green(`🧶 Weave renamed: ${slug} → ${newSlug}`));
        console.log(chalk.gray(`   ${JSON.stringify(result)}`));
    } catch (e) { fail(e); }
}

export async function renameReferenceCommand(slug: string, newSlug: string): Promise<void> {
    try {
        const result = await renameDocFile(
            { id: slug, newSlug },
            { getActiveLoomRoot, fs, loadDoc, saveDoc, resolveDocIdOrThrow },
        );
        console.log(chalk.green(`📚 Reference renamed: ${slug} → ${newSlug}`));
        console.log(chalk.gray(`   ${JSON.stringify(result)}`));
    } catch (e) { fail(e); }
}
