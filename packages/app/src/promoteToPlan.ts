import * as fs from 'fs-extra';
import * as path from 'path';
import { loadDoc, saveDoc } from '../../fs/dist';
import { AIClient, ChatDoc, IdeaDoc, DesignDoc, PlanDoc, PlanStep, createBaseFrontmatter, generateDocId, generatePlanId } from '../../core/dist';
import { buildSummarizationMessages, parseTitleAndBody } from './utils/aiSummarization';

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
1. <first concrete implementation step>
2. <second concrete implementation step>
3. <add as many steps as needed>

## Notes
<implementation notes, gotchas, open questions — no step labels here>

CRITICAL RULES:
- The ## Steps section MUST contain a numbered list with at least one item. A plan with no steps is invalid.
- Each step must be on its own line starting with a number and period: "1. ", "2. ", etc.
- Do NOT leave ## Steps empty. If the source is vague, infer concrete steps from the goal.
- Do NOT put step descriptions in ## Notes — Notes is for gotchas and context only.`;

export async function promoteToPlan(
    input: PromoteToPlanInput,
    deps: PromoteToPlanDeps
): Promise<{ filePath: string; title: string }> {
    const doc = await deps.loadDoc(input.filePath) as ChatDoc | IdeaDoc | DesignDoc;

    const { weaveId, threadId } = deriveLocation(input.filePath, deps.loomRoot);

    if (!doc.content || doc.content.trim().length === 0) {
        throw new Error(`${doc.type} document is empty.`);
    }

    const label = doc.type === 'chat'
        ? 'chat conversation'
        : `${doc.type} document titled "${doc.title}"`;
    const messages = buildSummarizationMessages(SYSTEM_PROMPT, label, doc.content);

    const reply = await deps.aiClient.complete(messages);

    const { title, body } = parseTitleAndBody(reply);

    const parsedSteps = parseNumberedSteps(body);
    if (parsedSteps.length === 0) {
        throw new Error(
            `promoteToPlan: AI generated no steps. A plan must have at least one step.\n` +
            `Full reply:\n${reply}`
        );
    }

    const plansDir = threadId
        ? path.join(deps.loomRoot, 'loom', weaveId, threadId, 'plans')
        : path.join(deps.loomRoot, 'loom', weaveId, 'plans');
    await deps.fs.ensureDir(plansDir);

    const idScope = threadId ?? weaveId;
    const existingFiles = await deps.fs.readdir(plansDir).catch(() => [] as string[]);
    const existingPlanIds = existingFiles
        .filter(f => f.endsWith('.md'))
        .map(f => f.replace(/\.md$/, ''));
    const planFilename = generatePlanId(idScope, existingPlanIds);
    const planId = generateDocId('plan');

    const frontmatter = createBaseFrontmatter('plan', planId, title, doc.id);
    const planDoc: PlanDoc = {
        ...frontmatter,
        type: 'plan',
        status: 'active',
        steps: parsedSteps,
        content: `# ${title}\n\n${body}`,
    } as unknown as PlanDoc;

    const filePath = path.join(plansDir, `${planFilename}.md`);
    await deps.saveDoc(planDoc, filePath);

    return { filePath, title };
}

function parseNumberedSteps(body: string): PlanStep[] {
    const match = body.match(/## Steps\s*\n([\s\S]*?)(?=\n##|$)/i);
    if (!match) return [];
    const steps: PlanStep[] = [];
    for (const line of match[1].split('\n')) {
        const m = line.match(/^\s*\d+\.\s+(.+)/);
        if (m) {
            steps.push({ order: steps.length + 1, description: m[1].trim(), done: false, files_touched: [], blockedBy: [] });
        }
    }
    return steps;
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
