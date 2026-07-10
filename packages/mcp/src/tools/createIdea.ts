import * as fs from 'fs-extra';
import { getActiveLoomRoot, saveDoc, loadDoc } from '../../../fs/dist';
import { weaveIdea } from '../../../app/dist/weaveIdea';

export const toolDef = {
    name: 'loom_create_idea',
    description: 'Create a new idea document in a specific thread — one idea per thread. Requires the thread\'s stable th_ ULID (create the thread first with loom_create_thread); an idea is never created loose at weave root and never mints a thread. **Always pass `content` to write the full body in this same call** — the doc is born at version 1 with real content. Only omit `content` if you genuinely do not have the body yet; do NOT create a stub and immediately follow with loom_update_doc — that is a wasted round-trip. The doc is created at status "draft" — finalize separately. Use this tool to create Loom idea docs — do not edit weave files directly.',
    inputSchema: {
        type: 'object' as const,
        properties: {
            weave_slug: { type: 'string', description: 'Target weave folder slug (directory name under loom/)' },
            thread_ulid: { type: 'string', description: 'Stable th_ ULID of the thread to place the idea in (create the thread first with loom_create_thread).' },
            title: { type: 'string', description: 'Human-readable title for the idea' },
            content: { type: 'string', description: 'Markdown body (no frontmatter). Provide this on creation so the doc is born at version 1 with real content — no follow-up loom_update_doc needed. Omit only if you truly have no body yet.' },
        },
        required: ['weave_slug', 'thread_ulid', 'title'],
    },
};

export async function handle(root: string, args: Record<string, unknown>) {
    const input = {
        weaveSlug: args['weave_slug'] as string,
        threadUlid: args['thread_ulid'] as string,
        title: args['title'] as string,
        content: args['content'] as string | undefined,
    };
    const result = await weaveIdea(input, {
        getActiveLoomRoot: () => getActiveLoomRoot(root),
        saveDoc,
        loadDoc,
        fs,
    });
    return { content: [{ type: 'text' as const, text: JSON.stringify(result) }] };
}
