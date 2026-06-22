import { resolveDocIdOrThrow, loadDoc, saveDoc } from '../../../fs/dist';
import { ChatDoc, lastAiBlockIndex, appendChatBlock } from '../../../core/dist';
import { getUserName, getAiName } from '../../../app/dist/utils/chatNames';

export const toolDef = {
    name: 'loom_append_to_chat',
    description: 'Append a new message to an existing chat document. IMPORTANT: this tool writes the role header itself (## AI: for role "ai", ## {UserName}: for role "user") — pass ONLY the reply body in the "body" argument, with NO "## AI:" / "## {name}:" header line of your own, or the chat ends up with a doubled header. Use this tool to add messages to Loom chats — do not edit chat files directly.',
    inputSchema: {
        type: 'object' as const,
        properties: {
            id: { type: 'string', description: 'Chat document id' },
            role: { type: 'string', enum: ['user', 'ai'], description: "Message author role. Defaults to 'ai' (the common caller); pass 'user' for the rare programmatic human turn." },
            body: { type: 'string', description: 'Message body (markdown) — the reply text ONLY. Do NOT prefix it with a "## AI:" / "## {name}:" role header; the tool adds the role header itself (including a header here produces a duplicate).' },
        },
        required: ['id', 'body'],
    },
};

export async function handle(root: string, args: Record<string, unknown>) {
    const id = args['id'] as string;
    // The MCP transport does not enforce schema `required`, and the overwhelming caller
    // is the AI — so an omitted role defaults to 'ai' rather than silently becoming a
    // user turn (which once mis-attributed an AI reply to the human). A *present* but
    // invalid role is a caller bug → fail loud instead of guessing.
    const role = args['role'] === undefined ? 'ai' : (args['role'] as string);
    if (role !== 'user' && role !== 'ai') {
        throw new Error(`loom_append_to_chat: role must be 'user' | 'ai' (got '${role}').`);
    }
    const body = args['body'] as string;

    // Primary (agent-supplied) id → suggest-on-miss.
    const { id: resolvedId, filePath } = await resolveDocIdOrThrow(root, id);

    const displayName = role === 'ai' ? getAiName(root) : getUserName(root);
    const doc = await loadDoc(filePath) as ChatDoc;
    const existingBody = (doc as any).content ?? '';
    // Seam normalization (one blank line before/after the header) lives in
    // appendChatBlock — shared with the app chatReply path so the two never drift.
    const appendedBody = appendChatBlock(existingBody, displayName, body);

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
