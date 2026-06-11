import { resolveDocIdOrThrow, loadDoc, saveDoc } from '../../../fs/dist';
import { ChatDoc, lastAiBlockIndex } from '../../../core/dist';
import { getUserName, getAiName } from '../../../app/dist/utils/chatNames';

export const toolDef = {
    name: 'loom_append_to_chat',
    description: 'Append a new message to an existing chat document. Use this tool to add messages to Loom chats — do not edit chat files directly.',
    inputSchema: {
        type: 'object' as const,
        properties: {
            id: { type: 'string', description: 'Chat document id' },
            role: { type: 'string', enum: ['user', 'ai'], description: 'Message author role' },
            body: { type: 'string', description: 'Message body (markdown)' },
        },
        required: ['id', 'role', 'body'],
    },
};

export async function handle(root: string, args: Record<string, unknown>) {
    const id = args['id'] as string;
    const role = args['role'] as string;
    const body = args['body'] as string;

    // Primary (agent-supplied) id → suggest-on-miss.
    const { id: resolvedId, filePath } = await resolveDocIdOrThrow(root, id);

    const displayName = role === 'ai' ? getAiName(root) : getUserName(root);
    const doc = await loadDoc(filePath) as ChatDoc;
    const existingBody = (doc as any).content ?? '';
    const appendedBody = `${existingBody}\n\n## ${displayName}\n\n${body}`;

    // When the AI replies, advance the read-cursor to the new last AI block so a later
    // loom_read_chat_tail returns only the human turns that follow it. A user turn never
    // moves the cursor. Header detection keys on the configured ai.model string.
    const updated: ChatDoc = {
        ...doc,
        content: appendedBody,
        ...(role === 'ai' ? { last_ai_block: lastAiBlockIndex(appendedBody, getAiName(root)) } : {}),
    } as ChatDoc;
    delete (updated as any)._path;

    await saveDoc(updated, filePath);

    return { content: [{ type: 'text' as const, text: JSON.stringify({ id: resolvedId, filePath }) }] };
}
