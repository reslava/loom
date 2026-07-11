import chalk from 'chalk';
import * as fs from 'fs-extra';
import { AIClient } from '../../../core/dist';
import { getActiveLoomRoot, loadDoc, saveDoc, resolveDocIdOrThrow } from '../../../fs/dist';
import { promoteToIdea } from '../../../app/dist/promoteToIdea';
import { promoteToDesign } from '../../../app/dist/promoteToDesign';
import { promoteToPlan } from '../../../app/dist/promoteToPlan';

/** The CLI is not an MCP host and has no sampling — promote must be given its body. */
const noSamplingClient: AIClient = {
    async complete(): Promise<string> {
        throw new Error('`loom promote` needs --body-file <path> — the terminal has no AI sampling to generate the body.');
    },
};

/**
 * `loom promote <doc> <type> --body-file <path>` — the CLI twin of loom_promote.
 * Content-supplied: you author the child body, promote does the parent→child
 * linkage + typed-doc creation. No host AI required (way ③ stays terminal-complete).
 */
export async function promoteCommand(
    doc: string,
    type: string,
    options: { bodyFile?: string; title?: string; weave?: string; thread?: string },
): Promise<void> {
    try {
        if (!['idea', 'design', 'plan'].includes(type)) {
            throw new Error(`Target type must be idea|design|plan, got '${type}'.`);
        }
        if (!options.bodyFile) {
            throw new Error('`loom promote` requires --body-file <path> (the terminal has no AI sampling).');
        }
        const loomRoot = getActiveLoomRoot();
        const { filePath } = await resolveDocIdOrThrow(loomRoot, doc);
        const body = await fs.readFile(options.bodyFile, 'utf8');

        const deps = { loadDoc, saveDoc, fs, aiClient: noSamplingClient, loomRoot };
        const target = {
            filePath,
            targetWeaveSlug: options.weave,
            targetThreadUlid: options.thread,
            title: options.title,
            body,
        };

        const result =
            type === 'idea' ? await promoteToIdea(target, deps)
            : type === 'design' ? await promoteToDesign(target, deps)
            : await promoteToPlan(target, deps);

        console.log(chalk.green(`⬆️  Promoted to ${type}: ${result.title}`));
        console.log(chalk.gray(`   ${result.filePath}`));
    } catch (e: any) {
        console.error(chalk.red(`❌ ${e.message}`));
        process.exit(1);
    }
}
