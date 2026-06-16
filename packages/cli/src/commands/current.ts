import chalk from 'chalk';
import { currentLoom } from '../../../app/dist/current';
import * as fs from 'fs-extra';
import { ConfigRegistry } from '../../../fs/dist';

export async function currentCommand(): Promise<void> {
    try {
        const registry = new ConfigRegistry();
        const info = await currentLoom({ fs, registry });
        
        if (!info.name) {
            console.log(chalk.yellow('No active loom set.'));
            console.log(chalk.gray(`  Run 'loom list' to see registered looms.`));
            console.log(chalk.gray(`  Run 'loom switch <name>' to activate one.`));
            return;
        }
        
        console.log(chalk.bold(`\n🧵 Active Loom\n`));
        
        if (info.isMonoLoom) {
            console.log(`  Mode: ${chalk.blue('mono‑loom')} (local project)`);
        } else {
            console.log(`  Mode: ${chalk.blue('multi‑loom')} (global registry)`);
        }
        
        console.log(`  Name: ${chalk.green(info.name)}`);
        console.log(`  Path: ${info.exists ? chalk.gray(info.path!) : chalk.red(`[missing] ${info.path}`)}`);
        
        if (!info.exists) {
            console.log(chalk.yellow(`\n  ⚠️  The active loom path does not exist.`));
            console.log(chalk.gray(`     Run 'loom switch <name>' to choose a different loom.`));
        }
    } catch (e: any) {
        console.error(chalk.red(`❌ ${e.message}`));
        process.exit(1);
    }
}