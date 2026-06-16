import { getStaleDocs } from '../../../app/dist';
import { getActiveLoomRoot, loadWeave, buildLinkIndex } from '../../../fs/dist';
import { ConfigRegistry } from '../../../fs/dist';
import * as fs from 'fs-extra';

export const toolDef = {
    name: 'loom_get_stale_docs',
    description: 'List all documents that may be stale: plans behind their design version, and docs whose parent was updated after the doc was created/updated.',
    inputSchema: {
        type: 'object' as const,
        properties: {},
        required: [],
    },
};

export async function handle(root: string, _args: Record<string, unknown>) {
    const registry = new ConfigRegistry();
    const stale = await getStaleDocs(
        { getActiveLoomRoot, loadWeave, buildLinkIndex, registry, fs, workspaceRoot: root }
    );

    return { content: [{ type: 'text' as const, text: JSON.stringify(stale, null, 2) }] };
}
