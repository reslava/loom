import * as fs from 'fs-extra';
import { createWeave } from '../../../app/dist/weave';

export const toolDef = {
    name: 'loom_create_weave',
    description:
        "Create an empty weave folder (`loom/{weave_slug}`). A weave has no manifest doc — this just materialises the directory so it appears in the tree and can hold threads (a weave contains only threads). Refuses if the weave already exists. Use this tool — do not create weave folders directly.",
    inputSchema: {
        type: 'object' as const,
        properties: {
            weave_slug: { type: 'string', description: 'Weave folder slug to create under loom/' },
        },
        required: ['weave_slug'],
    },
};

export async function handle(root: string, args: Record<string, unknown>) {
    const result = await createWeave(
        { weaveSlug: args['weave_slug'] as string },
        { getActiveLoomRoot: () => root, fs },
    );
    return { content: [{ type: 'text' as const, text: JSON.stringify(result) }] };
}
