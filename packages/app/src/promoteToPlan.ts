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

    const weaveId = doc.parent_id;
    if (!weaveId) {
        throw new Error('Document has no parent_id. Cannot determine target weave for the plan.');
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

    const plansDir = path.join(deps.loomRoot, 'loom', weaveId, 'plans');
    await deps.fs.ensureDir(plansDir);

    const existingFiles = await deps.fs.readdir(plansDir).catch(() => [] as string[]);
    const existingPlanIds = existingFiles
        .filter(f => f.endsWith('.md'))
        .map(f => f.replace(/\.md$/, ''));
    const planId = generatePlanId(weaveId, existingPlanIds);

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
