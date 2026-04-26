import * as fs from 'fs-extra';
import { getActiveLoomRoot, saveDoc, loadDoc } from '../../../fs/dist';
import { weaveDesign } from '../../../app/dist/weaveDesign';

export const toolDef = {
    name: 'loom_create_design',
    description: 'Create a new design document in a thread. Links to an existing idea if present. Use this tool to create Loom design docs — do not edit weave files directly.',
    inputSchema: {
        type: 'object' as const,
        properties: {
            weaveId: { type: 'string', description: 'Target weave id' },
            threadId: { type: 'string', description: 'Thread id inside the weave' },
            title: { type: 'string', description: 'Optional title override (defaults to idea title or threadId)' },
        },
        required: ['weaveId', 'threadId'],
    },
};

export async function handle(root: string, args: Record<string, unknown>) {
    const input = {
        weaveId: args['weaveId'] as string,
        threadId: args['threadId'] as string,
        title: args['title'] as string | undefined,
    };
    const result = await weaveDesign(input, {
        getActiveLoomRoot: () => getActiveLoomRoot(root),
        saveDoc,
        loadDoc,
        fs,
    });
    return { content: [{ type: 'text' as const, text: JSON.stringify(result) }] };
}
