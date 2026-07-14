import chalk from 'chalk';
import { getActiveLoomRoot } from '../../../fs/dist';
import { connectLocalMcp } from '../mcpClient';

/**
 * `loom refresh-ctx [--skeleton]` — the CLI twin of loom_refresh_ctx (global-only).
 *
 * ctx is global-only: one loom/ctx.md. Two modes:
 *  - --skeleton → seed ONLY the pillar skeleton (headings + hints), no AI. Fully
 *    standalone: writes the file for you to edit before a real generation.
 *  - default → the terminal has no AI sampling, so (like `loom report`) this prepares
 *    the refresh and prints a brief: the assembled source + the section template.
 *    Summarise the source under those sections and write the body via loom_update_doc.
 */
export async function refreshCtxCommand(options?: { skeleton?: boolean }): Promise<void> {
    try {
        const root = getActiveLoomRoot();
        const client = await connectLocalMcp(root);
        try {
            const raw = await client.callTool('loom_refresh_ctx', options?.skeleton ? { skeleton_only: true } : {});
            const res = JSON.parse(raw);

            if (options?.skeleton) {
                console.log(chalk.green(`🌱 Seeded ctx skeleton → ${res.targetPath}`));
                console.log(chalk.gray(`   Sections: ${res.template.join(' · ')}`));
                console.log(chalk.gray(`   Edit the headings/content, then \`loom refresh-ctx\` (or ask your AI) to fill them.`));
                return;
            }

            console.log(chalk.green(`📘 ctx refresh prepared → ${res.targetPath} (${res.ctxId})`));
            console.log(chalk.gray(`   ${res.preserveExisting ? 'Preserving existing sections' : 'Fresh doc — default pillars'}: ${res.template.join(' · ')}`));
            console.log('');
            console.log(chalk.bold('Assembled source — summarise it under the sections above, then write via loom_update_doc:'));
            console.log(res.source);
        } finally {
            await client.close();
        }
    } catch (e: any) {
        console.error(chalk.red(`❌ ${e.message}`));
        process.exit(1);
    }
}
