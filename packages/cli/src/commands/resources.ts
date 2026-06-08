import chalk from 'chalk';
import { getActiveLoomRoot } from '../../../fs/dist';
import { connectLocalMcp } from '../mcpClient';

/**
 * `loom resources` — list the concrete MCP resources (uri + title).
 *
 * Thin delivery shim over listResources(). Makes the MCP resource surface
 * discoverable from a plain terminal.
 */
export async function resourcesListCommand(): Promise<void> {
    try {
        const root = getActiveLoomRoot();
        const client = await connectLocalMcp(root);
        try {
            const resources = await client.listResources();
            if (resources.length === 0) {
                console.log(chalk.yellow('No resources advertised.'));
                return;
            }
            const width = Math.max(...resources.map((r) => r.uri.length));
            for (const r of resources) {
                console.log(`  ${chalk.cyan(r.uri.padEnd(width))}  ${r.title}`);
            }
        } finally {
            await client.close();
        }
    } catch (e: any) {
        console.error(chalk.red(`❌ ${e.message}`));
        process.exit(1);
    }
}

/**
 * `loom resources read <uri>` — read any MCP resource and print its contents.
 *
 * Generalizes `loom catalog` and makes templated resources like
 * loom://context/<id> reachable from the terminal.
 */
export async function resourcesReadCommand(uri: string): Promise<void> {
    try {
        const root = getActiveLoomRoot();
        const client = await connectLocalMcp(root);
        try {
            const contents = await client.readResource(uri);
            console.log(contents);
        } finally {
            await client.close();
        }
    } catch (e: any) {
        console.error(chalk.red(`❌ ${e.message}`));
        process.exit(1);
    }
}
