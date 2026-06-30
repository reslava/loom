import { getStaleDocs } from '../../../app/dist';
import { getActiveLoomRoot, loadWeave, buildLinkIndex } from '../../../fs/dist';
import { ConfigRegistry } from '../../../fs/dist';
import * as fs from 'fs-extra';

export const toolDef = {
    name: 'loom_get_stale_docs',
    description: 'List documents that may be stale: plans behind their design version, docs behind a locked req, and idea↔design date drift. By default only actionable docs (not done/cancelled) are returned — matching the VS Code tree. Pass all=true for the full historical view (incl. shipped/closed docs).',
    inputSchema: {
        type: 'object' as const,
        properties: {
            all: { type: 'boolean', description: 'Include done/cancelled (historical) stale docs too. Default false (actionable only).' },
        },
        required: [],
    },
};

export async function handle(root: string, args: Record<string, unknown>) {
    const registry = new ConfigRegistry();
    const includeDone = args['all'] === true;
    const stale = await getStaleDocs(
        { getActiveLoomRoot, loadWeave, buildLinkIndex, registry, fs, workspaceRoot: root },
        { includeDone },
    );

    return { content: [{ type: 'text' as const, text: JSON.stringify(stale, null, 2) }] };
}
