import { getState, GetStateDeps } from './getState';
import { Document } from '../../core/dist/entities/document';

export interface SearchDocsInput {
    query: string;
    /** Optional document type filter (idea | design | plan | ctx | chat | done). */
    type?: string;
    /** Optional weave id to scope the search. */
    weaveSlug?: string;
}

export interface SearchResult {
    id: string;
    type: string;
    title: string;
    weaveId: string;
    threadId?: string;
    filePath?: string;
    excerpt: string;
}

export type SearchDocsDeps = GetStateDeps;

function excerpt(content: string, query: string): string {
    const lower = content.toLowerCase();
    const idx = lower.indexOf(query.toLowerCase());
    if (idx === -1) return content.slice(0, 120).replace(/\n/g, ' ');
    const start = Math.max(0, idx - 60);
    const end = Math.min(content.length, idx + query.length + 60);
    return content.slice(start, end).replace(/\n/g, ' ');
}

/**
 * Search documents by a query string. Matches (case-insensitive substring) against
 * id, title, and content. Optionally filter by document type or weave id.
 *
 * Single source of truth for search: both the `loom_search_docs` MCP tool and the
 * `loom search` CLI command call this use-case.
 */
export async function searchDocs(input: SearchDocsInput, deps: SearchDocsDeps): Promise<SearchResult[]> {
    const query = input.query.toLowerCase();
    const typeFilter = input.type;
    const weaveFilter = input.weaveSlug;

    const state = await getState(
        deps,
        weaveFilter ? { weaveFilter: { idPattern: weaveFilter } } : undefined
    );

    const results: SearchResult[] = [];

    const matches = (doc: Document): boolean => {
        if (typeFilter && doc.type !== typeFilter) return false;
        const matchId = doc.id.toLowerCase().includes(query);
        const matchTitle = doc.title.toLowerCase().includes(query);
        const matchContent = doc.content?.toLowerCase().includes(query) ?? false;
        return matchId || matchTitle || matchContent;
    };

    for (const weave of state.weaves) {
        for (const thread of weave.threads) {
            for (const doc of thread.allDocs as Array<Document & { _path?: string }>) {
                if (!matches(doc)) continue;
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
        // Loose fibers (weave root, no thread)
        for (const doc of weave.looseFibers as Array<Document & { _path?: string }>) {
            if (!matches(doc)) continue;
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

    return results;
}
