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

    const { weaveId, threadId } = deriveLocation(input.filePath, deps.loomRoot);

    const turns = parseTurns(doc.content);
    if (turns.length === 0) {
        throw new Error('No conversation turns found in chat document.');
    }

    const messages: Message[] = [
        { role: 'system', content: SYSTEM_PROMPT },
        ...turns,
    ];

    const reply = await deps.aiClient.complete(messages);

    const { title, body } = parseTitleAndBody(reply);

    const targetDir = threadId
        ? path.join(deps.loomRoot, 'loom', weaveId, threadId)
        : path.join(deps.loomRoot, 'loom', weaveId);
    await deps.fs.ensureDir(targetDir);

    let ideaId: string;
    let filePath: string;
    if (threadId) {
        // Thread-level: canonical filename is {threadId}-idea.md (one per thread)
        ideaId = `${threadId}-idea`;
        filePath = path.join(targetDir, `${ideaId}.md`);
        if (await deps.fs.pathExists(filePath)) {
            throw new Error(`Thread '${threadId}' already has an idea. Refine the existing one instead.`);
        }
    } else {
        // Weave-level loose fiber: use kebab-of-title to allow multiple
        const existingFiles = await deps.fs.readdir(targetDir).catch(() => [] as string[]);
        const ideaFiles = existingFiles.filter(f => f.endsWith('-idea.md'));
        ideaId = generateIdeaId(title, weaveId, ideaFiles);
        filePath = path.join(targetDir, `${ideaId}.md`);
    }

    const idScope = threadId ?? weaveId;
    const frontmatter = createBaseFrontmatter('idea', ideaId, title, idScope);
    const ideaDoc: IdeaDoc = {
        ...frontmatter,
        type: 'idea',
        status: 'draft',
        content: `# ${title}\n\n${body}`,
    } as IdeaDoc;

    await deps.saveDoc(ideaDoc, filePath);

    return { filePath, title };
}

function parseTitleAndBody(reply: string): { title: string; body: string } {
    const lines = reply.split('\n');
    const titleIdx = lines.findIndex(l => /^TITLE:\s*.+$/i.test(l));
    if (titleIdx === -1) {
        throw new Error(`AI response missing TITLE: line. Got: "${reply.slice(0, 200)}"`);
    }
    const title = lines[titleIdx].match(/^TITLE:\s*(.+)$/i)![1].trim();
    const body = lines.slice(titleIdx + 1).join('\n').trim();
    return { title, body };
}

function deriveLocation(filePath: string, loomRoot: string): { weaveId: string; threadId?: string } {
    const rel = path.relative(path.join(loomRoot, 'loom'), filePath);
    const parts = rel.split(/[\\/]/);
    if (parts.length < 2) throw new Error(`Cannot derive weave from path: ${rel}`);
    const weaveId = parts[0];
    // loom/{weave}/chats/file → weave-level chat (no thread)
    if (parts.length >= 3 && parts[1] === 'chats') return { weaveId };
    // loom/{weave}/{thread}/chats/file or loom/{weave}/{thread}/{anything}
    if (parts.length >= 3) return { weaveId, threadId: parts[1] };
    // loom/{weave}/file (loose fiber at weave root)
    return { weaveId };
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
