import { ChatDoc, lastAiBlockIndex, tailAfterBlock } from '../../core/dist';

export interface ReadChatTailInput {
    id: string;
}

export interface ReadChatTailDeps {
    resolveDocId: (loomRoot: string, id: string) => Promise<{ id: string; filePath: string }>;
    loadDoc: (filePath: string) => Promise<any>;
    /** Configured AI header label (e.g. "AI:") from .loom/settings.json. */
    aiName: (loomRoot: string) => string;
    loomRoot: string;
}

export interface ReadChatTailResult {
    id: string;
    /** Markdown of the blocks after the last AI block — the human turns to reply to. */
    tail: string;
    hasNew: boolean;
    /** The cursor used: stored last_ai_block, else computed on the fly, else -1. */
    lastAiBlock: number;
}

/**
 * Returns only the chat turns since the AI last replied (content after the last AI
 * block), so a first-touch read costs the tail instead of the whole chat. Prefers the
 * stored `last_ai_block` cursor; falls back to computing it from the body for chats
 * written before the cursor existed.
 */
export async function readChatTail(
    input: ReadChatTailInput,
    deps: ReadChatTailDeps
): Promise<ReadChatTailResult> {
    const { id, filePath } = await deps.resolveDocId(deps.loomRoot, input.id);
    const doc = await deps.loadDoc(filePath) as ChatDoc;
    if (doc.type !== 'chat') {
        throw new Error(`'${id}' is not a chat document (type: ${doc.type}). loom_read_chat_tail only reads chats.`);
    }

    const body = (doc as any).content ?? '';
    const aiHeader = deps.aiName(deps.loomRoot);
    const idx = typeof doc.last_ai_block === 'number' ? doc.last_ai_block : lastAiBlockIndex(body, aiHeader);
    const tail = tailAfterBlock(body, idx);

    return { id, tail, hasNew: tail.length > 0, lastAiBlock: idx };
}
