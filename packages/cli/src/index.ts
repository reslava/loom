#!/usr/bin/env node
import { Command } from 'commander';
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
import { weaveIdeaCommand } from './commands/weave';
import { finalizeCommand } from './commands/finalize';
import { renameCommand } from './commands/rename';

const program = new Command();

program
  .name('loom')
  .description('REslava Loom — Weave ideas into features with AI')
  .version('0.1.0');

program
  .command('init')
  .description('Initialize a new Loom workspace at ~/looms/default/')
  .option('--force', 'Overwrite existing configuration')
  .action(initCommand);

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
  .command('status [thread-id]')
  .description('Show derived state of threads')
  .option('--verbose', 'Show detailed status including plan steps')
  .option('--json', 'Output as JSON')
  .option('--tokens', 'Show token usage (placeholder)')
  .action(statusCommand);  

program
  .command('validate [thread-id]')
  .description('Validate document integrity')
  .option('--all', 'Validate all threads')
  .option('--fix', 'Attempt to fix issues (not yet implemented)')
  .option('--verbose', 'Show detailed issues for all threads')
  .action(validateCommand); 

program
  .command('refine-design <thread-id>')
  .description('Fire REFINE_DESIGN event (increment version, mark plans stale)')
  .action(refineCommand); 

program
  .command('start-plan <plan-id>')
  .description('Fire START_PLAN event (activate implementation)')
  .action(startPlanCommand);  

program
  .command('complete-step <plan-id>')
  .description('Mark a plan step as done')
  .requiredOption('--step <n>', 'Step number to complete')
  .action(completeStepCommand);  

program
  .command('summarise-context <thread-id>')
  .description('Generate or regenerate the -ctx.md context summary')
  .option('--force', 'Overwrite existing summary even if fresh')
  .action(summariseCommand);
  
program
    .command('weave')
    .description('Weave a new document')
    .command('idea <title>')
    .description('Create a new idea document')
    .option('--thread <name>', 'Place the idea in a specific thread folder')
    .action((title, options) => {
        weaveIdeaCommand(title, options);
    });

program
    .command('finalize <temp-id>')
    .description('Finalize a draft document and generate its permanent ID')
    .action(finalizeCommand);    

program
    .command('rename <old-id> <new-title>')
    .description('Rename a finalized document and update all references')
    .action(renameCommand);    

program.parse(process.argv);