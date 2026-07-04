import * as fs from 'fs-extra';
import { saveDoc, loadDoc } from '../../../fs/dist';
import { chatNew } from '../../../app/dist/chatNew';

export const toolDef = {
    name: 'loom_create_chat',
    description: 'Create a new chat document in one of the two canonical chat homes. Thread chat: pass weave_slug + thread_ulid (the thread\'s stable th_ ULID) → {weave}/{thread}/chats. Refs chat: pass chatType="refs" → refs/chats. A non-refs chat with no resolvable thread errors — there is no weave-root chat.',
    inputSchema: {
        type: 'object' as const,
        properties: {
            chatType: { type: 'string', enum: ['thread', 'refs'], description: 'Chat level: "thread" for thread-scoped chats, "refs" for reference chats at loom/refs/chats/' },
            weave_slug: { type: 'string', description: 'Target weave folder slug (required for thread chats)' },
            thread_ulid: { type: 'string', description: 'Stable th_ ULID of the thread (required for thread chats)' },
            title: { type: 'string', description: 'Optional chat title' },
        },
        required: [],
    },
};

export async function handle(root: string, args: Record<string, unknown>) {
    const chatType = args['chatType'] as string | undefined;
    const input = {
        weaveSlug: chatType === 'refs' ? 'refs' : args['weave_slug'] as string,
        threadUlid: chatType === 'refs' ? undefined : args['thread_ulid'] as string | undefined,
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
