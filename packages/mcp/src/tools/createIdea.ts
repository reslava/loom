import * as fs from 'fs-extra';
import { getActiveLoomRoot, saveDoc, loadDoc } from '../../../fs/dist';
import { weaveIdea } from '../../../app/dist/weaveIdea';

export const toolDef = {
    name: 'loom_create_idea',
    description: 'Create a new idea document in a weave (optionally in a specific thread). **Always pass `content` to write the full body in this same call** — the doc is born at version 1 with real content. Only omit `content` if you genuinely do not have the body yet; do NOT create a stub and immediately follow with loom_update_doc — that is a wasted round-trip. The doc is created at status "draft" — finalize separately. Use this tool to create Loom idea docs — do not edit weave files directly.',
    inputSchema: {
        type: 'object' as const,
        properties: {
            weaveId: { type: 'string', description: 'Target weave id (directory name under loom/)' },
            threadId: { type: 'string', description: 'Optional thread id. If provided, places the idea inside the thread.' },
            title: { type: 'string', description: 'Human-readable title for the idea' },
            content: { type: 'string', description: 'Markdown body (no frontmatter). Provide this on creation so the doc is born at version 1 with real content — no follow-up loom_update_doc needed. Omit only if you truly have no body yet.' },
        },
        required: ['weaveId', 'title'],
    },
};

export async function handle(root: string, args: Record<string, unknown>) {
    const input = {
        weave: args['weaveId'] as string,
        threadId: args['threadId'] as string | undefined,
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
