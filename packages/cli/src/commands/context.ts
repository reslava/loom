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
 *  - an optional --scope:       loom context my-chat --scope doc  (only that doc, no bundle)
 *
 * The docId is passed straight into the resource URI, so the thread form and any
 * future templated forms work without special-casing here. `--scope doc` mirrors the
 * `read`/`reply` slang path (doc-only, no re-bundle); the default is the full bundle.
 */
export async function contextCommand(docId: string, options?: { mode?: string; scope?: string }): Promise<void> {
    try {
        const root = getActiveLoomRoot();
        const params = new URLSearchParams();
        if (options?.mode) params.set('mode', options.mode);
        if (options?.scope) params.set('scope', options.scope);
        const query = params.toString();
        const uri = `loom://context/${docId}${query ? `?${query}` : ''}`;
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
