import * as fs from 'fs-extra';
import * as path from 'path';
import { loadDoc, saveDoc } from '../../fs/dist';
import { AIClient, ChatDoc, IdeaDoc, DesignDoc, PlanDoc, PlanStep, createBaseFrontmatter, generateDocId, parseStepsTable, slugifyStepId, nextOrdinal, planFileName } from '../../core/dist';
import { buildSummarizationMessages, parseTitleAndBody } from './utils/aiSummarization';
import { parentDesignVersion } from './weavePlan';
import { resolveThreadFolder } from './utils/resolveThreadFolder';

export interface PromoteToPlanInput {
    filePath: string;
    targetWeaveSlug?: string;
    targetThreadUlid?: string;
    /** Optional title for the new plan, used when `body` is provided (skips AI). Defaults to the source doc title. */
    title?: string;
    /** Optional inline body. When provided, sampling is skipped and steps are parsed from it (table first, numbered-list fallback) — required in Claude Code where sampling is blocked. */
    body?: string;
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

    // Resolve the target: an explicit targetThreadUlid is a stable th_ ULID → folder
    // (never fabricates); a derived location already yields the folder slug.
    let weaveId: string;
    let threadId: string | undefined;
    if (input.targetWeaveSlug) {
        weaveId = input.targetWeaveSlug;
        threadId = input.targetThreadUlid
            ? (await resolveThreadFolder(input.targetWeaveSlug, input.targetThreadUlid, {
                getActiveLoomRoot: () => deps.loomRoot, loadDoc: deps.loadDoc, fs: deps.fs,
            })).threadSlug
            : undefined;
    } else {
        ({ weaveId, threadId } = deriveLocation(input.filePath, deps.loomRoot));
    }

    let title: string;
    let body: string;
    if (input.body !== undefined) {
        body = input.body;
        title = input.title ?? doc.title;
    } else {
        if (!doc.content || doc.content.trim().length === 0) {
            throw new Error(`${doc.type} document is empty.`);
        }
        const label = doc.type === 'chat'
            ? 'chat conversation'
            : `${doc.type} document titled "${doc.title}"`;
        const messages = buildSummarizationMessages(SYSTEM_PROMPT, label, doc.content);
        const reply = await deps.aiClient.complete(messages);
        ({ title, body } = parseTitleAndBody(reply));
    }

    // For an inline body, prefer a real steps table (how plans are normally structured),
    // falling back to a numbered list. The AI path always emits a numbered list.
    const parsedSteps = input.body !== undefined
        ? (parseStepsTable(body).length > 0 ? parseStepsTable(body) : parseNumberedSteps(body))
        : parseNumberedSteps(body);
    if (parsedSteps.length === 0) {
        throw new Error('promoteToPlan: no steps found. A plan must have at least one step (provide a Steps table or a numbered Steps list).');
    }

    const plansDir = threadId
        ? path.join(deps.loomRoot, 'loom', weaveId, threadId, 'plans')
        : path.join(deps.loomRoot, 'loom', weaveId, 'plans');
    await deps.fs.ensureDir(plansDir);

    const existingFiles = await deps.fs.readdir(plansDir).catch(() => [] as string[]);
    const planFilename = planFileName(nextOrdinal(existingFiles, 'plan'));
    const planId = generateDocId('plan');

    // Stamp the parent design's LIVE version as the staleness baseline. Omitting it
    // (the prior behaviour) left promoted plans with design_version undefined, so
    // `isPlanStale` (undefined < version → false) never flagged them — the inverse of
    // the create_plan constant-1 bug. Falls back to the floor when promoting outside a
    // thread or before a design exists.
    let designVersion = 1;
    if (threadId) {
        const threadPath = path.join(deps.loomRoot, 'loom', weaveId, threadId);
        const design = await parentDesignVersion(threadPath, threadId, { loadDoc: deps.loadDoc, fs: deps.fs });
        if (design) designVersion = design.version;
    }

    const frontmatter = createBaseFrontmatter('plan', planId, title, doc.id);
    const planDoc: PlanDoc = {
        ...frontmatter,
        type: 'plan',
        status: 'active',
        design_version: designVersion,
        target_version: '0.1.0',
        steps: parsedSteps,
        content: input.body !== undefined ? body : `# ${title}\n\n${body}`,
    } as unknown as PlanDoc;
    // Promoted plans are born frontmatter-native: steps live in YAML, the body table is
    // a generated view (the saver canonicalizes whatever table/list the promote source had).
    (planDoc as any)._stepsFromFrontmatter = true;

    const filePath = path.join(plansDir, planFilename);
    await deps.saveDoc(planDoc, filePath);

    return { filePath, title };
}

function parseNumberedSteps(body: string): PlanStep[] {
    const match = body.match(/#{1,2} Steps\s*\n([\s\S]*?)(?=\n#{1,2}\s|$)/i);
    if (!match) return [];
    const steps: PlanStep[] = [];
    const taken = new Set<string>();
    for (const line of match[1].split('\n')) {
        const m = line.match(/^\s*\d+\.\s+(.+)/);
        if (m) {
            const description = m[1].trim();
            steps.push({ id: slugifyStepId(description, taken), order: steps.length + 1, status: 'pending', title: description, description, files_touched: [], blockedBy: [], satisfies: [] });
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
