import chalk from 'chalk';
import { setupLoom } from '../../../app/dist';
import * as fs from 'fs-extra';
import { ConfigRegistry } from '../../../fs/dist';

export async function setupCommand(name: string, options: { path?: string; switch?: boolean }): Promise<void> {
    try {
        const registry = new ConfigRegistry();
        const result = await setupLoom(
            { name, path: options.path, switch: options.switch },
            { fs, registry }
        );
        if (result.activated) {
            console.log(chalk.green(`🧵 Loom '${result.name}' created and activated at ${result.path}`));
        } else {
            console.log(chalk.green(`🧵 Loom '${result.name}' created at ${result.path}`));
            console.log(chalk.gray(`   Run 'loom switch ${result.name}' to activate it.`));
        }
    } catch (e: any) {
        console.error(chalk.red(`❌ ${e.message}`));
        process.exit(1);
    }
}