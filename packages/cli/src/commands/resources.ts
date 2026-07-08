import chalk from 'chalk';
import { getActiveLoomRoot } from '../../../fs/dist';
import { connectLocalMcp } from '../mcpClient';

/**
 * `loom resources read <uri>` — read any MCP resource and print its contents.
 *
 * The live resource index now lives in `loom catalog resources` (the auto-generated
 * surface catalog); this generic reader remains for reading any resource — including
 * templated ones like loom://context/<id> — from the terminal.
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
