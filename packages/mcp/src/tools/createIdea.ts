import * as fs from 'fs-extra';
import { getActiveLoomRoot, saveDoc } from '../../../fs/dist';
import { weaveIdea } from '../../../app/dist/weaveIdea';

export const toolDef = {
    name: 'loom_create_idea',
    description: 'Create a new idea document in a weave (optionally in a specific thread). Pass `content` to write the body in the same call (born at version 1); omit it to get a stub you fill in later with loom_update_doc. The doc is created at status "draft" — finalize separately. Use this tool to create Loom idea docs — do not edit weave files directly.',
    inputSchema: {
        type: 'object' as const,
        properties: {
            weaveId: { type: 'string', description: 'Target weave id (directory name under loom/)' },
            threadId: { type: 'string', description: 'Optional thread id. If provided, places the idea inside the thread.' },
            title: { type: 'string', description: 'Human-readable title for the idea' },
            content: { type: 'string', description: 'Optional markdown body (no frontmatter). When provided, replaces the generated stub so the doc is born at version 1 with real content.' },
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
        fs,
    });
    return { content: [{ type: 'text' as const, text: JSON.stringify(result) }] };
}
