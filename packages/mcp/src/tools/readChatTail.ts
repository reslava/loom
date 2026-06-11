import { resolveDocIdOrThrow, loadDoc } from '../../../fs/dist';
import { getAiName } from '../../../app/dist/utils/chatNames';
import { readChatTail as readChatTailUseCase } from '../../../app/dist/readChatTail';

export const toolDef = {
    name: 'loom_read_chat_tail',
    description: 'Read only the NEW turns in a chat since the AI last replied — the content after the last AI block — instead of re-reading the whole chat. Use this on first touch of a chat doc in a conversation: it returns just the human turns you need to reply to, token-cheap. Returns the tail markdown (or a note if there is nothing new).',
    inputSchema: {
        type: 'object' as const,
        properties: {
            id: { type: 'string', description: 'Chat document id' },
        },
        required: ['id'],
    },
};

export async function handle(root: string, args: Record<string, unknown>) {
    const id = args['id'] as string;

    const result = await readChatTailUseCase(
        { id },
        {
            resolveDocId: resolveDocIdOrThrow,
            loadDoc,
            aiName: getAiName,
            loomRoot: root,
        }
    );

    const text = result.hasNew ? result.tail : '(no new turns since the last AI reply)';
    return { content: [{ type: 'text' as const, text }] };
}
