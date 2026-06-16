import chalk from 'chalk';
import { listLooms } from '../../../app/dist/list';
import * as fs from 'fs-extra';
import { ConfigRegistry } from '../../../fs/dist';

export async function listCommand(): Promise<void> {
    try {
        const registry = new ConfigRegistry();
        const looms = await listLooms({ fs, registry });
        
        if (looms.length === 0) {
            console.log(chalk.yellow('No looms registered.'));
            console.log(chalk.gray(`  Run 'loom init' to create a mono‑loom in the current directory.`));
            console.log(chalk.gray(`  Run 'loom init-multi' to create the global multi‑loom.`));
            return;
        }
        
        // Determine mode for header
        const isMono = registry.isMonoLoom();
        const modeText = isMono ? '' : chalk.gray(' (multi‑loom mode)');
        
        console.log(chalk.bold(`\n🧵 Registered Looms${modeText}\n`));
        
        for (const loom of looms) {
            const marker = loom.isActive ? chalk.green('★') : ' ';
            const nameDisplay = loom.isActive ? chalk.green.bold(loom.name) : loom.name;
            const pathDisplay = loom.exists ? chalk.gray(loom.path) : chalk.red(`[missing] ${loom.path}`);
            console.log(`  ${marker} ${nameDisplay.padEnd(15)} ${pathDisplay}`);
        }
        console.log(chalk.gray('\n  ★ = active loom'));
    } catch (e: any) {
        console.error(chalk.red(`❌ ${e.message}`));
        process.exit(1);
    }
}