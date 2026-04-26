import * as fs from 'fs-extra';
import * as path from 'path';
import { loadDoc, saveDoc } from '../../fs/dist';
import { AIClient, Message, ChatDoc, IdeaDoc, createBaseFrontmatter } from '../../core/dist';

export interface PromoteToIdeaInput {
    filePath: string;
}

export interface PromoteToIdeaDeps {
    loadDoc: typeof loadDoc;
    saveDoc: typeof saveDoc;
    fs: typeof fs;
    aiClient: AIClient;
    loomRoot: string;
}

const SYSTEM_PROMPT = `You are an AI assistant embedded in REslava Loom, a document-driven workflow system.
Your task: read the chat conversation and extract the most important idea discussed.
Respond with exactly this format — nothing else before or after:

TITLE: <one concise line describing the idea>

<idea body in Markdown with these sections>
## Problem
<what pain or gap this idea addresses>

## Idea
<the core concept in 2-3 sentences>

## Why now
<what makes this worth pursuing>

## Open questions
<what needs to be answered before committing to a design>

## Next step
<design | spike | discard>`;

function parseTurns(content: string): Message[] {
    const segments = content.split(/^## /m).slice(1);
    return segments
        .map(seg => {
            const lineEnd = seg.indexOf('\n');
            const header = lineEnd === -1 ? seg : seg.slice(0, lineEnd);
            const body = lineEnd === -1 ? '' : seg.slice(lineEnd + 1).trim();
            const role: 'user' | 'assistant' = header.startsWith('AI') ? 'assistant' : 'user';
            return { role, content: body };
        })
        .filter(m => m.content.length > 0);
}

export async function promoteToIdea(
    input: PromoteToIdeaInput,
    deps: PromoteToIdeaDeps
): Promise<{ filePath: string; title: string }> {
    const doc = await deps.loadDoc(input.filePath) as ChatDoc;

    const weaveId = doc.parent_id;
    if (!weaveId) {
        throw new Error('Chat document has no parent_id. Cannot determine target weave for the idea.');
    }

    const turns = parseTurns(doc.content);
    if (turns.length === 0) {
        throw new Error('No conversation turns found in chat document.');
    }

    const messages: Message[] = [
        { role: 'system', content: SYSTEM_PROMPT },
        ...turns,
    ];

    const reply = await deps.aiClient.complete(messages);

    const firstNewline = reply.indexOf('\n');
    const firstLine = firstNewline === -1 ? reply : reply.slice(0, firstNewline);
    const titleMatch = firstLine.match(/^TITLE:\s*(.+)$/i);
    if (!titleMatch) {
        throw new Error(`AI response did not start with TITLE: line. Got: "${firstLine}"`);
    }
    const title = titleMatch[1].trim();
    const body = firstNewline === -1 ? '' : reply.slice(firstNewline + 1).trim();

    const weavePath = path.join(deps.loomRoot, 'loom', weaveId);
    await deps.fs.ensureDir(weavePath);

    const existingFiles = await deps.fs.readdir(weavePath).catch(() => [] as string[]);
    const ideaFiles = existingFiles.filter(f => f.endsWith('-idea.md'));
    const ideaId = generateIdeaId(title, weaveId, ideaFiles);

    const frontmatter = createBaseFrontmatter('idea', ideaId, title, weaveId);
    const ideaDoc: IdeaDoc = {
        ...frontmatter,
        type: 'idea',
        status: 'draft',
        content: `# ${title}\n\n${body}`,
    } as IdeaDoc;

    const filePath = path.join(weavePath, `${ideaId}.md`);
    await deps.saveDoc(ideaDoc, filePath);

    return { filePath, title };
}

function generateIdeaId(title: string, weaveId: string, existingFiles: string[]): string {
    const kebab = title
        .toLowerCase()
        .replace(/[^\w\s-]/g, '')
        .trim()
        .replace(/\s+/g, '-')
        .replace(/-+/g, '-');
    const base = `${weaveId}-${kebab}-idea`;
    const taken = new Set(existingFiles.map(f => f.replace(/\.md$/, '')));
    if (!taken.has(base)) return base;
    let n = 2;
    while (taken.has(`${base}-${n}`)) n++;
    return `${base}-${n}`;
}
