import { searchDocs } from '../../../app/dist';
import { getActiveLoomRoot, loadWeave, buildLinkIndex } from '../../../fs/dist';
import { ConfigRegistry } from '../../../fs/dist';
import * as fs from 'fs-extra';

export const toolDef = {
    name: 'loom_search_docs',
    description: 'Search documents by a query string. Matches against id, title, and content (case-insensitive). Optionally filter by document type or weave slug.',
    inputSchema: {
        type: 'object' as const,
        properties: {
            query: { type: 'string', description: 'Search query (case-insensitive substring match)' },
            type: { type: 'string', enum: ['idea', 'design', 'plan', 'ctx', 'chat', 'done'], description: 'Optional document type filter' },
            weave_slug: { type: 'string', description: 'Optional weave folder slug to scope the search' },
        },
        required: ['query'],
    },
};

export async function handle(root: string, args: Record<string, unknown>) {
    const registry = new ConfigRegistry();
    const results = await searchDocs(
        {
            query: args['query'] as string,
            type: args['type'] as string | undefined,
            weaveSlug: args['weave_slug'] as string | undefined,
        },
        { getActiveLoomRoot, loadWeave, buildLinkIndex, registry, fs, workspaceRoot: root }
    );

    return { content: [{ type: 'text' as const, text: JSON.stringify(results, null, 2) }] };
}
