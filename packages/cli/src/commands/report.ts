import chalk from 'chalk';
import { getActiveLoomRoot } from '../../../fs/dist';
import { connectLocalMcp } from '../mcpClient';

/**
 * `loom report <kind> [--weave <slug>]` — assemble a report brief and print it.
 *
 * Brief-returning (like `loom next`, the do-next-step shim): the CLI does not run
 * inference. It prints the assembled source slice + synthesis instruction; the
 * running agent reads it, writes the report, and persists it via loom_create_report.
 * Slice 1: kind "project-overview" over the roadmap, no filters.
 */
export async function reportCommand(kind: string, options: { weave?: string }): Promise<void> {
    try {
        const root = getActiveLoomRoot();
        const client = await connectLocalMcp(root);
        try {
            const args: Record<string, string> = { kind };
            if (options.weave) args.weaveSlug = options.weave;
            const out = await client.getPrompt('report', args);
            console.log(out);
        } finally {
            await client.close();
        }
    } catch (e: any) {
        console.error(chalk.red(`❌ ${e.message}`));
        process.exit(1);
    }
}
