import { getState } from '../../../app/dist/getState';
import { getActiveLoomRoot, loadWeave, buildLinkIndex } from '../../../fs/dist';
import { ConfigRegistry } from '../../../core/dist';
import { Document } from '../../../core/dist';
import * as fs from 'fs-extra';

export const toolDef = {
    name: 'loom_search_docs',
    description: 'Search documents by a query string. Matches against id, title, and content (case-insensitive). Optionally filter by document type or weave id.',
    inputSchema: {
        type: 'object' as const,
        properties: {
            query: { type: 'string', description: 'Search query (case-insensitive substring match)' },
            type: { type: 'string', enum: ['idea', 'design', 'plan', 'ctx', 'chat', 'done'], description: 'Optional document type filter' },
            weaveId: { type: 'string', description: 'Optional weave id to scope the search' },
        },
        required: ['query'],
    },
};

interface SearchResult {
    id: string;
    type: string;
    title: string;
    weaveId: string;
    threadId?: string;
    filePath?: string;
    excerpt: string;
}

function excerpt(content: string, query: string): string {
    const lower = content.toLowerCase();
    const idx = lower.indexOf(query.toLowerCase());
    if (idx === -1) return content.slice(0, 120).replace(/\n/g, ' ');
    const start = Math.max(0, idx - 60);
    const end = Math.min(content.length, idx + query.length + 60);
    return content.slice(start, end).replace(/\n/g, ' ');
}

export async function handle(root: string, args: Record<string, unknown>) {
    const query = (args['query'] as string).toLowerCase();
    const typeFilter = args['type'] as string | undefined;
    const weaveFilter = args['weaveId'] as string | undefined;

    const registry = new ConfigRegistry();
    const state = await getState(
        { getActiveLoomRoot, loadWeave, buildLinkIndex, registry, fs, workspaceRoot: root },
        weaveFilter ? { weaveFilter: { idPattern: weaveFilter } } : undefined
    );

    const results: SearchResult[] = [];

    for (const weave of state.weaves) {
        for (const thread of weave.threads) {
            const allDocs: Array<Document & { _path?: string }> = thread.allDocs as any;
            for (const doc of allDocs) {
                if (typeFilter && doc.type !== typeFilter) continue;
                const matchId = doc.id.toLowerCase().includes(query);
                const matchTitle = doc.title.toLowerCase().includes(query);
                const matchContent = doc.content?.toLowerCase().includes(query);
                if (!matchId && !matchTitle && !matchContent) continue;
                results.push({
                    id: doc.id,
                    type: doc.type,
                    title: doc.title,
                    weaveId: weave.id,
                    threadId: thread.id,
                    filePath: doc._path,
                    excerpt: excerpt(doc.content ?? '', query),
                });
            }
        }
        // Loose fibers
        for (const doc of weave.looseFibers as any[]) {
            if (typeFilter && doc.type !== typeFilter) continue;
            const matchId = doc.id.toLowerCase().includes(query);
            const matchTitle = doc.title.toLowerCase().includes(query);
            const matchContent = doc.content?.toLowerCase().includes(query);
            if (!matchId && !matchTitle && !matchContent) continue;
            results.push({
                id: doc.id,
                type: doc.type,
                title: doc.title,
                weaveId: weave.id,
                filePath: doc._path,
                excerpt: excerpt(doc.content ?? '', query),
            });
        }
    }

    return { content: [{ type: 'text' as const, text: JSON.stringify(results, null, 2) }] };
}
