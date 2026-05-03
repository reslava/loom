import { loadDoc, saveDoc } from '../../fs/dist';
import { AIClient, Message, ChatDoc } from '../../core/dist';

export interface ChatReplyInput {
    filePath: string;
}

export interface ChatReplyDeps {
    loadDoc: typeof loadDoc;
    saveDoc: typeof saveDoc;
    aiClient: AIClient;
}

const SYSTEM_PROMPT = `You are an AI assistant embedded in REslava Loom, a document-driven workflow system for AI-assisted development.
You are in Chat Mode: brainstorm, explore, and answer questions freely. Do not propose state changes unless explicitly asked.
Your response will be appended to the document as a new ## AI: block. Reply in plain Markdown without wrapping your answer in a code block.`;

const FALLBACK_INSTRUCTION = `The text inside <CHAT> below is the full chat document. The conversation may be malformed (start with an AI turn, contain consecutive same-role turns, or have other irregularities). Read it as a whole and reply to the most recent message from the user. Do not address the malformed structure; just continue the conversation naturally.`;

interface Turn {
    role: 'user' | 'assistant';
    content: string;
}

/**
 * Parse the chat content into role-alternating turns.
 *
 * Robust against:
 * - `## ` lines inside fenced code blocks (skipped — not treated as headers).
 * - Consecutive same-role turns (collapsed into one with a blank line between).
 * - Empty turns (dropped).
 *
 * Returns turns in source order. Caller decides whether the shape is usable.
 */
function parseTurns(content: string): Turn[] {
    const lines = content.split(/\r?\n/);
    const segments: { header: string; body: string[] }[] = [];
    let inFence = false;
    let current: { header: string; body: string[] } | null = null;

    for (const line of lines) {
        if (/^\s*```/.test(line)) {
            inFence = !inFence;
            if (current) current.body.push(line);
            continue;
        }
        if (!inFence && /^## /.test(line)) {
            if (current) segments.push(current);
            current = { header: line.slice(3).trim(), body: [] };
            continue;
        }
        if (current) current.body.push(line);
    }
    if (current) segments.push(current);

    const raw: Turn[] = segments
        .map(s => ({
            role: (s.header.toLowerCase().startsWith('ai') ? 'assistant' : 'user') as 'user' | 'assistant',
            content: s.body.join('\n').trim(),
        }))
        .filter(t => t.content.length > 0);

    // Collapse consecutive same-role turns.
    const collapsed: Turn[] = [];
    for (const t of raw) {
        const last = collapsed[collapsed.length - 1];
        if (last && last.role === t.role) {
            last.content = `${last.content}\n\n${t.content}`;
        } else {
            collapsed.push(t);
        }
    }
    return collapsed;
}

/**
 * Build messages for the AI call.
 *
 * Strategy:
 * - If the chat is well-formed (alternates user/assistant, last turn is from the
 *   user), send as role-segmented turns — that is the right shape for chat
 *   continuation.
 * - If malformed (starts with assistant, or last turn is assistant), fall back
 *   to single-message: send the whole chat verbatim inside a `<CHAT>` block
 *   and ask the model to continue. This keeps the workflow alive no matter
 *   what shape the chat is in.
 *
 * Refuses only one case: zero non-empty turns at all (the chat is literally
 * empty). That is operator error worth surfacing.
 */
function buildMessages(rawContent: string, turns: Turn[]): Message[] {
    if (turns.length === 0) {
        throw new Error('Chat document has no content. Write a message under ## Rafa: first.');
    }

    const wellFormed = turns[0].role === 'user' && turns[turns.length - 1].role === 'user';
    if (wellFormed) {
        return [{ role: 'system', content: SYSTEM_PROMPT }, ...turns];
    }

    return [
        { role: 'system', content: `${SYSTEM_PROMPT}\n\n${FALLBACK_INSTRUCTION}` },
        { role: 'user', content: `<CHAT>\n${rawContent.trim()}\n</CHAT>\n\nReply to the most recent user message in the chat above.` },
    ];
}

export async function chatReply(
    input: ChatReplyInput,
    deps: ChatReplyDeps
): Promise<{ appended: string }> {
    const doc = await deps.loadDoc(input.filePath) as ChatDoc;

    const turns = parseTurns(doc.content);
    const messages = buildMessages(doc.content, turns);

    const reply = await deps.aiClient.complete(messages);
    const appended = `\n\n## AI:\n${reply}`;
    const updatedContent = doc.content.trimEnd() + appended;

    await deps.saveDoc({ ...doc, content: updatedContent }, input.filePath);

    return { appended: reply };
}
