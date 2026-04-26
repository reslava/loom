import * as fs from 'fs-extra';
import { saveDoc } from '../../../fs/dist';
import { chatNew } from '../../../app/dist/chatNew';

export const toolDef = {
    name: 'loom_create_chat',
    description: 'Create a new chat document in a weave or thread. Use this tool to create Loom chat docs — do not edit weave files directly.',
    inputSchema: {
        type: 'object' as const,
        properties: {
            weaveId: { type: 'string', description: 'Target weave id' },
            threadId: { type: 'string', description: 'Optional thread id. If provided, places the chat inside the thread.' },
            title: { type: 'string', description: 'Optional chat title' },
        },
        required: ['weaveId'],
    },
};

export async function handle(root: string, args: Record<string, unknown>) {
    const input = {
        weaveId: args['weaveId'] as string,
        threadId: args['threadId'] as string | undefined,
        title: args['title'] as string | undefined,
    };
    const result = await chatNew(input, {
        saveDoc,
        fs,
        loomRoot: root,
    });
    return { content: [{ type: 'text' as const, text: JSON.stringify(result) }] };
}
