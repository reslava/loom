import chalk from 'chalk';
import { getActiveLoomRoot } from '../../../fs/dist';
import { connectLocalMcp } from '../mcpClient';

/**
 * `loom context <docId>` — print the assembled context bundle for a doc or thread.
 *
 * Thin delivery shim over readResource('loom://context/<docId>'). Accepts:
 *  - a plain doc id:            loom context my-thread-design
 *  - the thread form:           loom context thread/<weave>/<thread>
 *  - an optional --mode:        loom context my-chat --mode chat
 *
 * The docId is passed straight into the resource URI, so the thread form and any
 * future templated forms work without special-casing here.
 */
export async function contextCommand(docId: string, options?: { mode?: string }): Promise<void> {
    try {
        const root = getActiveLoomRoot();
        const uri = `loom://context/${docId}${options?.mode ? `?mode=${options.mode}` : ''}`;
        const client = await connectLocalMcp(root);
        try {
            const bundle = await client.readResource(uri);
            console.log(bundle);
        } finally {
            await client.close();
        }
    } catch (e: any) {
        console.error(chalk.red(`❌ ${e.message}`));
        process.exit(1);
    }
}
