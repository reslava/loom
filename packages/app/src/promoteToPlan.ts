import * as fs from 'fs-extra';
import * as path from 'path';
import { loadDoc, saveDoc } from '../../fs/dist';
import { AIClient, Message, ChatDoc, IdeaDoc, DesignDoc, PlanDoc, createBaseFrontmatter, generatePlanId } from '../../core/dist';

export interface PromoteToPlanInput {
    filePath: string;
}

export interface PromoteToPlanDeps {
    loadDoc: typeof loadDoc;
    saveDoc: typeof saveDoc;
    fs: typeof fs;
    aiClient: AIClient;
    loomRoot: string;
}

const SYSTEM_PROMPT = `You are an AI assistant embedded in REslava Loom, a document-driven workflow system.
Your task: read the provided document and produce an implementation plan.
Respond with exactly this format — nothing else before or after:

TITLE: <one concise line describing the plan>

## Goal
<what this plan implements in 1-2 sentences>

## Steps
| Done | # | Step | Files touched | Blocked by |
|------|---|------|---------------|------------|
| ⬜ | 1 | <step description> | <files> | — |
| ⬜ | 2 | <step description> | <files> | 1 |

## Notes
<any implementation notes, gotchas, or context for each step>`;

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

export async function promoteToPlan(
    input: PromoteToPlanInput,
    deps: PromoteToPlanDeps
): Promise<{ filePath: string; title: string }> {
    const doc = await deps.loadDoc(input.filePath) as ChatDoc | IdeaDoc | DesignDoc;

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

    const plansDir = threadId
        ? path.join(deps.loomRoot, 'loom', weaveId, threadId, 'plans')
        : path.join(deps.loomRoot, 'loom', weaveId, 'plans');
    await deps.fs.ensureDir(plansDir);

    const idScope = threadId ?? weaveId;
    const existingFiles = await deps.fs.readdir(plansDir).catch(() => [] as string[]);
    const existingPlanIds = existingFiles
        .filter(f => f.endsWith('.md'))
        .map(f => f.replace(/\.md$/, ''));
    const planId = generatePlanId(idScope, existingPlanIds);

    const frontmatter = createBaseFrontmatter('plan', planId, title, doc.id);
    const planDoc: PlanDoc = {
        ...frontmatter,
        type: 'plan',
        status: 'draft',
        steps: [],
        content: `# ${title}\n\n${body}`,
    } as unknown as PlanDoc;

    const filePath = path.join(plansDir, `${planId}.md`);
    await deps.saveDoc(planDoc, filePath);

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
