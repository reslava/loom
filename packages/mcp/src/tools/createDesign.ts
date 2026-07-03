import * as fs from 'fs-extra';
import { getActiveLoomRoot, saveDoc, loadDoc } from '../../../fs/dist';
import { weaveDesign } from '../../../app/dist/weaveDesign';

export const toolDef = {
    name: 'loom_create_design',
    description: 'Create a new design document in a thread. Links to an existing idea if present. **Always pass `content` to write the full body in this same call** — the doc is born at version 1 with real content. Only omit `content` if you genuinely do not have the body yet; do NOT create a stub and immediately follow with loom_update_doc — that is a wasted round-trip. The doc is created at status "draft" — finalize separately. Use this tool to create Loom design docs — do not edit weave files directly.',
    inputSchema: {
        type: 'object' as const,
        properties: {
            weave_slug: { type: 'string', description: 'Target weave folder slug' },
            thread_ulid: { type: 'string', description: 'Stable th_ ULID of the thread inside the weave' },
            title: { type: 'string', description: 'Optional title override (defaults to idea title or thread slug)' },
            content: { type: 'string', description: 'Markdown body (no frontmatter). Provide this on creation so the doc is born at version 1 with real content — no follow-up loom_update_doc needed. Omit only if you truly have no body yet.' },
        },
        required: ['weave_slug', 'thread_ulid'],
    },
};

export async function handle(root: string, args: Record<string, unknown>) {
    const input = {
        weaveSlug: args['weave_slug'] as string,
        threadUlid: args['thread_ulid'] as string,
        title: args['title'] as string | undefined,
        content: args['content'] as string | undefined,
    };
    const result = await weaveDesign(input, {
        getActiveLoomRoot: () => getActiveLoomRoot(root),
        saveDoc,
        loadDoc,
        fs,
    });
    return { content: [{ type: 'text' as const, text: JSON.stringify(result) }] };
}
