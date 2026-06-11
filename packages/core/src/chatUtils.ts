/**
 * Chat body parsing for the read-cursor / tail-read optimization.
 *
 * A chat body is an optional `# Title` H1 followed by a sequence of `## {header}`
 * blocks (the configured user/ai header strings, e.g. `## Rafa:` / `## AI:`). The
 * header label is NOT hardcoded — callers pass the configured value from
 * `.loom/settings.json` (see app `chatNames`). This module owns the block model so
 * the cursor (last AI block index) is computed the same way on write (append) and
 * read (tail), and never drifts.
 */

export interface ChatBlock {
    /** The header label after `## ` (e.g. "AI:" or "Rafa:"), trimmed. */
    header: string;
    /** Full block text including its `## ` header line. */
    text: string;
}

const BLOCK_HEADER_RE = /^##\s+(.+?)\s*$/;

/** Split a chat body into its `## {header}` blocks, in order. Content before the
 *  first `## ` header (e.g. the `# Title` H1) is not a block and is dropped. */
export function parseChatBlocks(body: string): ChatBlock[] {
    const lines = body.split('\n');
    const blocks: ChatBlock[] = [];
    let current: { header: string; lines: string[] } | null = null;

    for (const line of lines) {
        const m = line.match(BLOCK_HEADER_RE);
        if (m) {
            if (current) blocks.push({ header: current.header, text: current.lines.join('\n') });
            current = { header: m[1].trim(), lines: [line] };
        } else if (current) {
            current.lines.push(line);
        }
    }
    if (current) blocks.push({ header: current.header, text: current.lines.join('\n') });
    return blocks;
}

/** 0-based index of the last block authored by the AI (header === aiHeader), or -1. */
export function lastAiBlockIndex(body: string, aiHeader: string): number {
    const blocks = parseChatBlocks(body);
    for (let i = blocks.length - 1; i >= 0; i--) {
        if (blocks[i].header === aiHeader) return i;
    }
    return -1;
}

/**
 * The text of all blocks AFTER `blockIndex` (the new turns since the AI last replied),
 * joined as they appear in the doc. `blockIndex < 0` means "no AI block yet" → return
 * every block (the whole conversation so far). Returns '' when nothing follows.
 */
export function tailAfterBlock(body: string, blockIndex: number): string {
    const blocks = parseChatBlocks(body);
    const from = blockIndex < 0 ? 0 : blockIndex + 1;
    return blocks.slice(from).map(b => b.text.trim()).filter(Boolean).join('\n\n');
}
