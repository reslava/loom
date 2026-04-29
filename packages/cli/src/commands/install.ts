import chalk from 'chalk';
import * as fs from 'fs-extra';
import { ConfigRegistry } from '../../../core/dist/registry';
import { installWorkspace } from '../../../app/dist/installWorkspace';

export async function installCommand(options: { force?: boolean }): Promise<void> {
    try {
        const registry = new ConfigRegistry();
        const result = await installWorkspace(
            { force: options.force },
            { fs, registry, cwd: process.cwd() }
        );

        console.log(chalk.green('🧵 Loom installed successfully.\n'));
        console.log(`   Workspace: ${result.path}`);
        console.log(`   .loom/        ${result.loomDirCreated ? chalk.green('created') : chalk.gray('already exists')}`);
        console.log(`   .loom/CLAUDE.md  ${result.claudeMdWritten ? chalk.green('written') : chalk.gray('skipped')}`);
        console.log(`   CLAUDE.md     ${result.rootClaudeMdPatched ? chalk.green('patched (@.loom/CLAUDE.md added)') : chalk.gray('already configured')}`);
        console.log(`   .claude/settings.json  ${result.mcpJsonWritten ? chalk.green('written') : chalk.gray('already exists (use --force to overwrite)')}`);
        console.log(`   loom/loom-ctx.md       ${result.loomCtxWritten ? chalk.green('written') : chalk.gray('already exists (use --force to overwrite)')}`);
        console.log('');
        console.log(chalk.cyan('Next: open this workspace in Claude Code — Loom MCP tools are ready.'));
    } catch (e: any) {
        console.error(chalk.red(`❌ ${e.message}`));
        process.exit(1);
    }
}
