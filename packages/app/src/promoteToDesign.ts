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

    const { weaveId, threadId } = deriveLocation(input.filePath, deps.loomRoot);

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

    const { title, body } = parseTitleAndBody(reply);

    const targetDir = threadId
        ? path.join(deps.loomRoot, 'loom', weaveId, threadId)
        : path.join(deps.loomRoot, 'loom', weaveId);
    await deps.fs.ensureDir(targetDir);

    let designId: string;
    let filePath: string;
    if (threadId) {
        // Thread-level: canonical filename is {threadId}-design.md (one per thread)
        designId = `${threadId}-design`;
        filePath = path.join(targetDir, `${designId}.md`);
        if (await deps.fs.pathExists(filePath)) {
            throw new Error(`Thread '${threadId}' already has a design. Refine the existing one instead.`);
        }
    } else {
        // Weave-level loose fiber: kebab-of-title
        const existingFiles = await deps.fs.readdir(targetDir).catch(() => [] as string[]);
        designId = generateDesignId(title, weaveId, existingFiles);
        filePath = path.join(targetDir, `${designId}.md`);
    }

    const frontmatter = createBaseFrontmatter('design', designId, title, doc.id);
    const designDoc: DesignDoc = {
        ...frontmatter,
        type: 'design',
        status: 'draft',
        content: `# ${title}\n\n${body}`,
    } as DesignDoc;

    await deps.saveDoc(designDoc, filePath);

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
    if (parts.length >= 3 && parts[1] === 'chats') return { weaveId };
    if (parts.length >= 3) return { weaveId, threadId: parts[1] };
    return { weaveId };
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
