import { Message } from '../../../core/dist';

/**
 * Build messages for a summarization-style AI call (promote, refine, generate ctx).
 *
 * Critical: this is NOT a chat continuation. The whole transcript is sent as a
 * single user message wrapped in a TRANSCRIPT block, so the model treats it as
 * input to summarize rather than impersonating a participant. Splitting the
 * transcript into role-segmented turns (as chat-reply does) tricks the model
 * into replying *as* the AI in the chat — which is how we ended up with
 * refusals like "I cannot create or modify files on your local system".
 *
 * Use this for: promoteToIdea/Design/Plan, refineIdea/Plan/Design, summarise.
 * Do NOT use for chatReply — that one genuinely needs role continuation.
 */
export function buildSummarizationMessages(
    systemPrompt: string,
    transcriptLabel: string,
    transcriptContent: string,
): Message[] {
    const hardenedSystem = `${systemPrompt}

STRICT OUTPUT RULES:
- Do NOT refuse. This is a text-summarization task; you are not editing files or executing commands. The caller writes the file from your output.
- Do NOT address the user, do NOT explain what you are doing, do NOT add any preamble or postamble.
- The FIRST line of your reply MUST be \`TITLE: <text>\`. No blank line, no commentary before it.
- Output the format above and NOTHING else.`;

    const userMessage = `Here is the ${transcriptLabel} to summarize.

<TRANSCRIPT>
${transcriptContent}
</TRANSCRIPT>

Produce the output now in the exact format specified by the system prompt. Begin with the \`TITLE:\` line.`;

    return [
        { role: 'system', content: hardenedSystem },
        { role: 'user', content: userMessage },
    ];
}

/**
 * Parse a "TITLE: line + body" reply. Lenient: scans for the first line that
 * matches `^TITLE:` rather than demanding it be the very first line, so a small
 * preamble does not blow up the call. If no TITLE: line is found at all, throws
 * with the FULL reply included (not truncated) — refusals are usually only
 * diagnosable from the whole message.
 */
export function parseTitleAndBody(reply: string): { title: string; body: string } {
    const lines = reply.split('\n');
    const titleIdx = lines.findIndex(l => /^TITLE:\s*.+$/i.test(l));
    if (titleIdx === -1) {
        throw new Error(`AI response missing TITLE: line. Full reply was:\n${reply}`);
    }
    const title = lines[titleIdx].match(/^TITLE:\s*(.+)$/i)![1].trim();
    const body = lines.slice(titleIdx + 1).join('\n').trim();
    return { title, body };
}
