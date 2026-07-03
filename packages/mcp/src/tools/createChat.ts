import * as fs from 'fs-extra';
import { saveDoc, loadDoc } from '../../../fs/dist';
import { chatNew } from '../../../app/dist/chatNew';

export const toolDef = {
    name: 'loom_create_chat',
    description: 'Create a new chat document. Use chatType="thread" for thread chats (requires weaveId + threadId) or chatType="refs" for reference chats at loom/refs/chats/.',
    inputSchema: {
        type: 'object' as const,
        properties: {
            chatType: { type: 'string', enum: ['thread', 'refs'], description: 'Chat level: "thread" for thread-scoped chats, "refs" for reference chats at loom/refs/chats/' },
            weaveId: { type: 'string', description: 'Target weave id (required for thread chats)' },
            threadId: { type: 'string', description: 'Thread id (required for thread chats)' },
            title: { type: 'string', description: 'Optional chat title' },
        },
        required: [],
    },
};

export async function handle(root: string, args: Record<string, unknown>) {
    const chatType = args['chatType'] as string | undefined;
    const input = {
        weaveId: chatType === 'refs' ? 'refs' : args['weaveId'] as string,
        threadId: chatType === 'refs' ? undefined : args['threadId'] as string | undefined,
        title: args['title'] as string | undefined,
    };
    const result = await chatNew(input, {
        saveDoc,
        loadDoc,
        fs,
        loomRoot: root,
    });
    return { content: [{ type: 'text' as const, text: JSON.stringify(result) }] };
}
