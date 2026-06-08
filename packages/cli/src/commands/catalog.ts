import chalk from 'chalk';
import { getActiveLoomRoot } from '../../../fs/dist';
import { connectLocalMcp } from '../mcpClient';

/**
 * `loom catalog` — print the grouped index of every loom_* MCP tool.
 *
 * Thin delivery shim: resolve the active loom root, drive the in-process MCP
 * client to read loom://catalog, print the grouped markdown. No domain logic.
 */
export async function catalogCommand(): Promise<void> {
    try {
        const root = getActiveLoomRoot();
        const client = await connectLocalMcp(root);
        try {
            const markdown = await client.readResource('loom://catalog');
            console.log(markdown);
        } finally {
            await client.close();
        }
    } catch (e: any) {
        console.error(chalk.red(`❌ ${e.message}`));
        process.exit(1);
    }
}
