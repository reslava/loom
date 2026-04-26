import * as fs from 'fs-extra';
import * as path from 'path';
import { loadDoc, saveDoc } from '../../fs/dist';
import { AIClient, Message, ChatDoc, IdeaDoc, DesignDoc, createBaseFrontmatter } from '../../core/dist';

export interface PromoteToDesignInput {
    filePath: string;
}

export interface PromoteToDesignDeps {
    loadDoc: typeof loadDoc;
    saveDoc: typeof saveDoc;
    fs: typeof fs;
    aiClient: AIClient;
    loomRoot: string;
}

const SYSTEM_PROMPT = `You are an AI assistant embedded in REslava Loom, a document-driven workflow system.
Your task: read the provided document and produce a design doc that formalizes the idea or conversation.
Respond with exactly this format — nothing else before or after:

TITLE: <one concise line describing the design>

## Goal
<what this design achieves in 1-2 sentences>

## Context
<background, constraints, and motivation>

## Design
<the proposed solution — architecture, key decisions, trade-offs>

## Decisions
<list of concrete decisions made, one per bullet>

## Open questions
<anything still unresolved>`;

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

export async function promoteToDesign(
    input: PromoteToDesignInput,
    deps: PromoteToDesignDeps
): Promise<{ filePath: string; title: string }> {
    const doc = await deps.loadDoc(input.filePath) as ChatDoc | IdeaDoc;

    const weaveId = doc.parent_id;
    if (!weaveId) {
        throw new Error('Document has no parent_id. Cannot determine target weave for the design.');
    }

    let messages: Message[];
    if (doc.type === 'chat') {
        const turns = parseTurns(doc.content);
        if (turns.length === 0) {
            throw new Error('No conversation turns found in chat document.');
        }
        messages = [{ role: 'system', content: SYSTEM_PROMPT }, ...turns];
    } else {
        messages = [
            { role: 'system', content: SYSTEM_PROMPT },
            { role: 'user', content: `Here is the ${doc.type} document titled "${doc.title}":\n\n${doc.content}` },
        ];
    }

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
    const designId = generateDesignId(title, weaveId, existingFiles);

    const frontmatter = createBaseFrontmatter('design', designId, title, doc.id);
    const designDoc: DesignDoc = {
        ...frontmatter,
        type: 'design',
        status: 'draft',
        content: `# ${title}\n\n${body}`,
    } as DesignDoc;

    const filePath = path.join(weavePath, `${designId}.md`);
    await deps.saveDoc(designDoc, filePath);

    return { filePath, title };
}

function generateDesignId(title: string, weaveId: string, existingFiles: string[]): string {
    const kebab = title
        .toLowerCase()
        .replace(/[^\w\s-]/g, '')
        .trim()
        .replace(/\s+/g, '-')
        .replace(/-+/g, '-');
    const base = `${weaveId}-${kebab}-design`;
    const taken = new Set(existingFiles.map(f => f.replace(/\.md$/, '')));
    if (!taken.has(base)) return base;
    let n = 2;
    while (taken.has(`${base}-${n}`)) n++;
    return `${base}-${n}`;
}
