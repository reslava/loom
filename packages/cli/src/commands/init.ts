import chalk from 'chalk';
import { initLocal, initMulti } from '../../../app/dist/init';
import * as fs from 'fs-extra';
import { ConfigRegistry } from '../../../fs/dist';

export async function initCommand(options: { force?: boolean }): Promise<void> {
    try {
        const registry = new ConfigRegistry();
        const result = await initLocal({ force: options.force }, { fs, registry });
        console.log(chalk.green(`🧵 Mono‑loom initialized at ${result.path}`));
    } catch (e: any) {
        console.error(chalk.red(`❌ ${e.message}`));
        process.exit(1);
    }
}

export async function initMultiCommand(options: { force?: boolean }): Promise<void> {
    try {
        const registry = new ConfigRegistry();
        const result = await initMulti({ force: options.force }, { fs, registry });
        console.log(chalk.green(`🧵 Multi‑loom initialized at ${result.path}`));
        console.log(chalk.green(`   Active loom: ${result.name}`));
    } catch (e: any) {
        console.error(chalk.red(`❌ ${e.message}`));
        process.exit(1);
    }
}