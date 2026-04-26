#!/usr/bin/env node
import { Command } from 'commander';
import * as path from 'path';
import { initCommand } from './commands/init';
import { setupCommand } from './commands/setup';
import { switchCommand } from './commands/switch';
import { listCommand } from './commands/list';
import { currentCommand } from './commands/current';
import { statusCommand } from './commands/status';
import { validateCommand } from './commands/validate';
import { refineCommand } from './commands/refine';
import { startPlanCommand } from './commands/startPlan';
import { completeStepCommand } from './commands/completeStep';
import { summariseCommand } from './commands/summarise';
import { weaveIdeaCommand } from './commands/weaveIdea';
import { weaveDesignCommand } from './commands/weaveDesign';
import { weavePlanCommand } from './commands/weavePlan';
import { finalizeCommand } from './commands/finalize';
import { renameCommand } from './commands/rename';

const program = new Command();

program
    .name('loom')
    .description('REslava Loom — Weave ideas into features with AI')
    .version('0.2.0');

program
    .command('init')
    .description('Initialize a mono‑loom workspace in the current directory')
    .option('--force', 'Overwrite existing configuration')
    .action(initCommand);

program
    .command('init-multi')
    .description('Initialize the global multi‑loom workspace at ~/looms/default')
    .option('--force', 'Overwrite existing configuration')
    .action(initCommand); // Uses same command with different defaults

program
    .command('setup <name>')
    .description('Create a new named Loom workspace')
    .option('--path <path>', 'Custom path for the loom')
    .option('--no-switch', 'Do not set as active loom after creation')
    .action(setupCommand);

program
    .command('switch <name>')
    .description('Switch the active loom context')
    .action(switchCommand);

program
    .command('list')
    .description('List all registered looms')
    .action(listCommand);

program
    .command('current')
    .description('Show the currently active loom')
    .action(currentCommand);

program
    .command('status [weave-id]')
    .description('Show derived state of weaves')
    .option('--verbose', 'Show detailed status including plan steps')
    .option('--json', 'Output as JSON')
    .option('--tokens', 'Show token usage (placeholder)')
    .option('--filter <criteria>', 'Filter weaves (e.g., status=active|implementing,phase=planning)')
    .option('--sort <order>', 'Sort weaves (e.g., id:asc, id:desc)')
    .action(statusCommand);

program
    .command('validate [weave-id]')
    .description('Validate document integrity')
    .option('--all', 'Validate all weaves')
    .option('--fix', 'Attempt to fix issues (not yet implemented)')
    .option('--verbose', 'Show detailed issues for all weaves')
    .action(validateCommand);

program
    .command('refine-design <weave-id>')
    .description('Fire REFINE_DESIGN event')
    .action(refineCommand);

program
    .command('start-plan <plan-id>')
    .description('Fire START_PLAN event')
    .action(startPlanCommand);

program
    .command('complete-step <plan-id>')
    .description('Mark a plan step as done')
    .requiredOption('--step <n>', 'Step number to complete')
    .action(completeStepCommand);

program
    .command('summarise-context <weave-id>')
    .description('Generate or regenerate -ctx.md summary')
    .option('--force', 'Overwrite existing summary')
    .action(summariseCommand);

const weaveCmd = program
    .command('weave')
    .description('Weave a new document');

weaveCmd
    .command('idea <title>')
    .description('Create a new idea document (default: creates a thread named after the title)')
    .option('--weave <name>', 'Place the idea in a specific weave folder')
    .option('--thread <id>', 'Explicit thread ID (overrides auto-name from title)')
    .option('--loose', 'Create as a loose fiber at weave root instead of in a thread')
    .action(weaveIdeaCommand);

weaveCmd
    .command('design <weave-id>')
    .description('Create a new design document from an existing idea')
    .option('--title <title>', 'Custom title for the design')
    .option('--thread <id>', 'Create design inside this thread')
    .action(weaveDesignCommand);

weaveCmd
    .command('plan <weave-id>')
    .description('Create a new plan from a finalized design')
    .option('--title <title>', 'Custom title for the plan')
    .option('--goal <goal>', 'Goal description for the plan')
    .option('--thread <id>', 'Create plan inside this thread')
    .action(weavePlanCommand);

program
    .command('finalize <temp-id>')
    .description('Finalize a draft document and generate its permanent ID')
    .action(finalizeCommand);

program
    .command('rename <old-id> <new-title>')
    .description('Rename a finalized document and update all references')
    .action(renameCommand);

program
    .command('mcp')
    .description('Start the Loom MCP server (stdio transport)')
    .action(() => {
        const mcpEntry = path.resolve(__dirname, '../../mcp/dist/index.js');
        try {
            require(mcpEntry);
        } catch (e: any) {
            console.error('Loom MCP server not built. Run: ./scripts/build-all.sh');
            process.exit(1);
        }
    });

program.parse(process.argv);