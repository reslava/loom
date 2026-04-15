#!/usr/bin/env node
import { Command } from 'commander';
import { initCommand } from './commands/init';
import { setupCommand } from './commands/setup';
import { switchCommand } from './commands/switch';
import { listCommand } from './commands/list';
import { currentCommand } from './commands/current';
import { statusCommand } from './commands/status';
import { validateCommand } from './commands/validate';

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

program.parse(process.argv);