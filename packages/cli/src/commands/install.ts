import chalk from 'chalk';
import * as fs from 'fs-extra';
import { ConfigRegistry } from '../../../fs/dist';
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
        console.log(`   CLAUDE-LOCAL.md  ${result.claudeLocalMdWritten ? chalk.green('created (your local rules go here)') : chalk.gray('already exists (left untouched)')}`);
        console.log(`   CLAUDE.md     ${result.rootClaudeMdPatched ? chalk.green('patched (imports @.loom/CLAUDE.md + @CLAUDE-LOCAL.md)') : chalk.gray('already configured')}`);
        console.log(`   .mcp.json     ${result.mcpJsonWritten ? chalk.green('written') : chalk.gray('already exists (use --force to overwrite)')}`);
        console.log(`   loom/ctx.md   ${result.ctxWritten ? chalk.green('written') : chalk.gray('already exists (use --force to overwrite)')}`);
        console.log(`   .loom/settings.json  ${result.settingsJsonWritten ? chalk.green('written') : chalk.gray('already exists (use --force to overwrite)')}`);
        console.log(`   .claude/settings.local.json  ${result.settingsLocalJsonWritten ? chalk.green('attribution block written') : chalk.gray('already configured (use --force to overwrite)')}`);
        console.log(`   .github/ISSUE_TEMPLATE/feedback.yml  ${result.feedbackTemplateWritten ? chalk.green('scaffolded (backs `loom feedback`)') : chalk.gray('already exists (left untouched)')}`);
        console.log('');
        console.log(chalk.cyan('Next: open this workspace in Claude Code — Loom MCP tools are ready.'));
    } catch (e: any) {
        console.error(chalk.red(`❌ ${e.message}`));
        process.exit(1);
    }
}
