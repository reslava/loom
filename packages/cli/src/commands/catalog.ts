import chalk from 'chalk';
import { getActiveLoomRoot } from '../../../fs/dist';
import { connectLocalMcp } from '../mcpClient';

// Valid ?kind= filters, validated at the CLI edge for a friendly error. The server
// re-validates authoritatively (mirrored here only to fail before spawning MCP).
const CATALOG_KINDS = ['tools', 'resources', 'prompts'];

/**
 * `loom catalog [kind]` — print the grouped index of the loom_* MCP surface
 * (tools + resources + prompts). An optional `kind` filters to one section.
 *
 * Thin delivery shim: resolve the active loom root, drive the in-process MCP
 * client to read loom://catalog[?kind=], print the grouped markdown. No domain logic.
 */
export async function catalogCommand(kind?: string): Promise<void> {
    try {
        if (kind !== undefined && !CATALOG_KINDS.includes(kind)) {
            console.error(chalk.red(`❌ Invalid kind "${kind}". Valid: ${CATALOG_KINDS.join(', ')} (or omit for the whole surface).`));
            process.exit(1);
        }
        const root = getActiveLoomRoot();
        const client = await connectLocalMcp(root);
        try {
            const uri = kind ? `loom://catalog?kind=${kind}` : 'loom://catalog';
            const markdown = await client.readResource(uri);
            console.log(markdown);
        } finally {
            await client.close();
        }
    } catch (e: any) {
        console.error(chalk.red(`❌ ${e.message}`));
        process.exit(1);
    }
}
