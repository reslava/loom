import chalk from 'chalk';
import { switchLoom } from '../../../app/dist/switch';
import * as fs from 'fs-extra';
import { ConfigRegistry } from '../../../fs/dist';

export async function switchCommand(name: string): Promise<void> {
    try {
        const registry = new ConfigRegistry();
        const result = await switchLoom({ name }, { fs, registry });
        console.log(chalk.green(`🧵 Switched to loom '${result.name}' (${result.path})`));
    } catch (e: any) {
        console.error(chalk.red(`❌ ${e.message}`));
        process.exit(1);
    }
}