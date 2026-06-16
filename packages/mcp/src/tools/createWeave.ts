import * as fs from 'fs-extra';
import { createWeave } from '../../../app/dist/weave';

export const toolDef = {
    name: 'loom_create_weave',
    description:
        "Create an empty weave folder (`loom/{weaveId}`). A weave has no manifest doc — this just materialises the directory so it appears in the tree and can hold threads/loose fibers. Refuses if the weave already exists. Use this tool — do not create weave folders directly.",
    inputSchema: {
        type: 'object' as const,
        properties: {
            weaveId: { type: 'string', description: 'Weave id (folder slug) to create under loom/' },
        },
        required: ['weaveId'],
    },
};

export async function handle(root: string, args: Record<string, unknown>) {
    const result = await createWeave(
        { weaveId: args['weaveId'] as string },
        { getActiveLoomRoot: () => root, fs },
    );
    return { content: [{ type: 'text' as const, text: JSON.stringify(result) }] };
}
