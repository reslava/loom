import * as fs from 'fs-extra';
import { createReference } from '../../../app/dist/createReference';

export const toolDef = {
    name: 'loom_create_reference',
    description: 'Create a new reference document in loom/refs/. Named {slug}-reference.md. Do NOT include the word "reference" in the title — the `-reference` suffix is added automatically (a trailing type word is stripped to avoid "x-reference-reference.md"). Pass `content` to write the body in the same call; omit it for a placeholder. Reference docs are born at status "active" (no draft gate). Returns the doc id, file path, and slug.',
    inputSchema: {
        type: 'object' as const,
        properties: {
            title: { type: 'string', description: 'Human-readable reference title' },
            description: { type: 'string', description: 'Short description of what this reference covers (stored in frontmatter)' },
            content: { type: 'string', description: 'Optional markdown body (no frontmatter). When provided, replaces the placeholder body.' },
        },
        required: ['title'],
    },
};

export async function handle(root: string, args: Record<string, unknown>) {
    const result = await createReference(
        {
            title: args['title'] as string,
            description: args['description'] as string | undefined,
            content: args['content'] as string | undefined,
        },
        { getActiveLoomRoot: () => root, fs },
    );
    return { content: [{ type: 'text' as const, text: JSON.stringify(result) }] };
}
