import * as fsExtra from 'fs-extra';
import { Server } from '@modelcontextprotocol/sdk/server/index.js';
import { getActiveLoomRoot, saveDoc, loadDoc, findDocumentById, resolveDocIdOrThrow, loadWeave } from '../../../fs/dist';
import { Document, PlanStep, generateStepsTable } from '../../../core/dist';
import { weaveIdea } from '../../../app/dist/weaveIdea';
import { weaveDesign } from '../../../app/dist/weaveDesign';
import { weavePlan } from '../../../app/dist/weavePlan';
import { createReq } from '../../../app/dist/req';
import { handleContextResource } from '../resources/context';
import { requestSampling, SamplingMessage } from '../sampling';
import { handle as appendToChatHandle } from './appendToChat';

function msg(role: 'user' | 'assistant', text: string): SamplingMessage {
    return { role, content: { type: 'text', text } };
}

async function loadExtraContext(root: string, ids: string[]): Promise<string> {
    const parts = await Promise.all(
        ids.map(async (id) => {
            try {
                const fp = await findDocumentById(root, id);
                if (!fp) return null;
                const doc = await loadDoc(fp) as Document;
                return `### ${doc.title} (${doc.type})\n\n${(doc as any).content ?? ''}`;
            } catch { return null; }
        })
    );
    return parts.filter(Boolean).join('\n\n---\n\n');
}

type ToolModule = {
    toolDef: { name: string; description: string; inputSchema: object };
    handle: (root: string, args: Record<string, unknown>) => Promise<{ content: Array<{ type: 'text'; text: string }> }>;
};

function makeTool(
    name: string,
    description: string,
    inputSchema: object,
    handler: (root: string, args: Record<string, unknown>) => Promise<unknown>
): ToolModule {
    return {
        toolDef: { name, description, inputSchema },
        handle: async (root, args) => ({
            content: [{ type: 'text' as const, text: JSON.stringify(await handler(root, args)) }],
        }),
    };
}

export function createGenerateTools(server: Server): ToolModule[] {
    return [
        makeTool(
            'loom_generate_idea',
            'Generate a Loom idea document using AI sampling. Creates the doc and writes the AI-generated body. Requires sampling support from the MCP client.',
            {
                type: 'object' as const,
                properties: {
                    weaveId: { type: 'string', description: 'Target weave ID' },
                    threadId: { type: 'string', description: 'Target thread ID (optional)' },
                    title: { type: 'string', description: 'Title for the new idea doc' },
                    prompt: { type: 'string', description: 'Description of the idea to generate' },
                },
                required: ['weaveId', 'title', 'prompt'],
            },
            async (root, args) => {
                const weaveId = args['weaveId'] as string;
                const threadId = args['threadId'] as string | undefined;
                const title = args['title'] as string;
                const prompt = args['prompt'] as string;

                const body = await requestSampling(
                    server,
                    [msg('user', `Draft a Loom idea document for the following:\n\n${prompt}\n\nWrite only the markdown body — no frontmatter. Start with a problem statement.`)],
                    'You are a Loom document author. Write concise, focused Loom idea documents.'
                );

                const { id, filePath } = await weaveIdea(
                    { title, weave: weaveId, threadId },
                    { getActiveLoomRoot: () => getActiveLoomRoot(root), saveDoc, fs: fsExtra }
                );

                const doc = await loadDoc(filePath) as Document;
                await saveDoc({ ...doc, content: body, version: doc.version + 1 } as Document, filePath);

                return { id, filePath };
            }
        ),

        makeTool(
            'loom_generate_design',
            'Generate a Loom design document from thread context using AI sampling. Requires sampling support from the MCP client.',
            {
                type: 'object' as const,
                properties: {
                    weaveId: { type: 'string', description: 'Target weave ID' },
                    threadId: { type: 'string', description: 'Target thread ID' },
                    title: { type: 'string', description: 'Title for the new design doc' },
                    context_ids: { type: 'array', items: { type: 'string' }, description: 'Optional. Additional doc IDs to inject as context.' },
                },
                required: ['weaveId', 'threadId', 'title'],
            },
            async (root, args) => {
                const weaveId = args['weaveId'] as string;
                const threadId = args['threadId'] as string;
                const title = args['title'] as string;
                const contextIds = Array.isArray(args['context_ids']) ? (args['context_ids'] as string[]) : [];

                const messages: SamplingMessage[] = [];
                try {
                    const ctx = await handleContextResource(root, `loom://context/thread/${weaveId}/${threadId}`);
                    messages.push(msg('user', `Thread context:\n\n${ctx.contents[0].text}`));
                } catch { /* best-effort */ }
                if (contextIds.length > 0) {
                    const extra = await loadExtraContext(root, contextIds);
                    if (extra) messages.push(msg('user', `Additional context:\n\n${extra}`));
                }
                messages.push(msg('user', [
                    `Draft a Loom design document titled "${title}". Write only the markdown body — no frontmatter.`,
                    'Include: Goal, Architecture (high-level structure), Key Decisions (with rationale), Open Questions.',
                    'Do NOT include a "Next Steps" or "Implementation Steps" section — those belong in the plan, not the design.',
                    'Do NOT pre-decompose implementation into a numbered list. Designs describe *what* and *why*; plans describe *how* and *in what order*.',
                    'Respect scope exclusions from the idea/chat — if the user said "no JS" or "no responsive QA", do not introduce them in the design.',
                ].join('\n')));

                const body = await requestSampling(
                    server,
                    messages,
                    'You are a Loom document author. Write detailed, structured Loom design documents.'
                );

                const { id, filePath } = await weaveDesign(
                    { weaveId, title, threadId },
                    { getActiveLoomRoot: () => getActiveLoomRoot(root), saveDoc, loadDoc, fs: fsExtra }
                );

                const doc = await loadDoc(filePath) as Document;
                await saveDoc({ ...doc, content: body, version: doc.version + 1 } as Document, filePath);

                return { id, filePath };
            }
        ),

        makeTool(
            'loom_generate_plan',
            'Generate a Loom implementation plan from thread context using AI sampling. Returns the created plan with steps. Requires sampling support from the MCP client.',
            {
                type: 'object' as const,
                properties: {
                    weaveId: { type: 'string', description: 'Target weave ID' },
                    threadId: { type: 'string', description: 'Target thread ID' },
                    title: { type: 'string', description: 'Title for the new plan doc' },
                    context_ids: { type: 'array', items: { type: 'string' }, description: 'Optional. Additional doc IDs to inject as context.' },
                },
                required: ['weaveId', 'threadId', 'title'],
            },
            async (root, args) => {
                const weaveId = args['weaveId'] as string;
                const threadId = args['threadId'] as string;
                const title = args['title'] as string;
                const contextIds = Array.isArray(args['context_ids']) ? (args['context_ids'] as string[]) : [];

                const messages: SamplingMessage[] = [];
                try {
                    const ctx = await handleContextResource(root, `loom://context/thread/${weaveId}/${threadId}`);
                    messages.push(msg('user', `Thread context:\n\n${ctx.contents[0].text}`));
                } catch { /* best-effort */ }
                if (contextIds.length > 0) {
                    const extra = await loadExtraContext(root, contextIds);
                    if (extra) messages.push(msg('user', `Additional context:\n\n${extra}`));
                }
                messages.push(msg('user', [
                    `Generate an implementation plan for "${title}".`,
                    '',
                    'Rules:',
                    '- Steps map to **deliverables**, not design subsections. If the idea or design names a "Deliverables" list, use it as the step skeleton.',
                    '- Aim for the smallest step count that ships every deliverable. 2-4 steps is normal; >5 is suspect — collapse fine-grained sub-tasks into the deliverable they belong to.',
                    '- Each step description names a concrete output (e.g. "Create pricing.html with three-tier markup and inline CSS, Pro highlighted") not a sub-decision (e.g. "Add box-shadow to Pro tier").',
                    '- Do NOT invent QA, testing, accessibility-review, responsive-check, or post-implementation review steps unless the design names them as explicit deliverables.',
                    '- Respect scope exclusions stated in the idea or chat (e.g. "no JS", "no responsive QA") — do not add steps for excluded work.',
                    '- If the thread has a locked req (it appears first in the context), treat its ❌ Excluded items and ⛓ Constraints as HARD BOUNDARIES, cover every ✅ Included requirement, and cite the requirement ids (IN/C handles) each step advances in `satisfies`.',
                    '',
                    'Return ONLY a JSON array of steps — no prose, no markdown fences:',
                    '[{"order":1,"description":"...","satisfies":["IN1"]},{"order":2,"description":"...","satisfies":[]}]',
                ].join('\n')));

                const generated = await requestSampling(
                    server,
                    messages,
                    'You are a Loom document author. Output ONLY valid JSON arrays for implementation plans.',
                    8192
                );

                let steps: Array<{ order: number; description: string; satisfies?: string[] }> = [];
                try {
                    const jsonMatch = generated.match(/\[[\s\S]*\]/);
                    if (jsonMatch) steps = JSON.parse(jsonMatch[0]);
                } catch {
                    steps = [{ order: 1, description: `Generated plan:\n\n${generated}` }];
                }

                // Materialise the generated steps (with their satisfies citations) into the
                // plan body — passing `content` so weavePlan parses the Steps table back into
                // the frontmatter steps. Previously the generated steps were dropped entirely,
                // producing an empty plan.
                const planSteps: PlanStep[] = steps.map((s, i) => ({
                    order: s.order ?? i + 1,
                    description: s.description ?? '',
                    done: false,
                    files_touched: [],
                    blockedBy: [],
                    satisfies: Array.isArray(s.satisfies) ? s.satisfies : [],
                }));
                const content = `## Goal\n\n${title}\n\n## Steps\n\n${generateStepsTable(planSteps)}\n`;

                const { id, filePath } = await weavePlan(
                    { weaveId, title, threadId, content },
                    { loadWeave, saveDoc, loadDoc, fs: fsExtra, loomRoot: root }
                );

                return { id, filePath, steps };
            }
        ),

        makeTool(
            'loom_generate_reference',
            'Generate the body of a reference document using AI sampling. Reads the doc created by loom_create_reference, optionally loads thread context, generates content, and saves it. Requires sampling support.',
            {
                type: 'object' as const,
                properties: {
                    id: { type: 'string', description: 'Reference document ID (from loom_create_reference)' },
                    weaveId: { type: 'string', description: 'Optional weave ID to load for additional context' },
                    threadId: { type: 'string', description: 'Optional thread ID to load for additional context' },
                    context_ids: { type: 'array', items: { type: 'string' }, description: 'Optional additional doc IDs to load as context' },
                },
                required: ['id'],
            },
            async (root, args) => {
                const id = args['id'] as string;
                const weaveId = args['weaveId'] as string | undefined;
                const threadId = args['threadId'] as string | undefined;
                const contextIds = Array.isArray(args['context_ids']) ? (args['context_ids'] as string[]) : [];

                // Primary (agent-supplied) id → suggest-on-miss.
                const { filePath: fp } = await resolveDocIdOrThrow(root, id);
                const doc = await loadDoc(fp) as Document;

                const messages: SamplingMessage[] = [];

                if (weaveId && threadId) {
                    try {
                        const ctx = await handleContextResource(root, `loom://context/thread/${weaveId}/${threadId}`);
                        messages.push(msg('user', `Thread context:\n\n${ctx.contents[0].text}`));
                    } catch { /* best-effort */ }
                }

                if (contextIds.length > 0) {
                    const extra = await loadExtraContext(root, contextIds);
                    if (extra) messages.push(msg('user', `Additional context:\n\n${extra}`));
                }

                const refTitle = doc.title;
                const refDescription = (doc as any).description ?? '';
                messages.push(msg('user', [
                    `Write a complete reference document titled "${refTitle}".`,
                    refDescription ? `Description: ${refDescription}` : '',
                    'Write only the markdown body — no frontmatter.',
                    'Use clear headings, concise prose, and diagrams (ASCII or Mermaid) where helpful.',
                    'This is a reference document — write authoritatively and factually.',
                ].filter(Boolean).join('\n')));

                const body = await requestSampling(
                    server,
                    messages,
                    'You are a technical writer creating structured reference documents for software projects.'
                );

                await saveDoc({ ...doc, content: body, version: doc.version + 1 } as Document, fp);

                return { id, filePath: fp };
            }
        ),

        makeTool(
            'loom_generate_req',
            "Generate a thread's req (requirements) doc from its chat using AI sampling — faithfully extracts the user's explicitly-stated Included / Excluded / Constraints into a draft req.md. Requires sampling support: works in the VS Code extension; blocked in Claude Code CLI sessions (where the agent should extract and call loom_create_req with `content` instead).",
            {
                type: 'object' as const,
                properties: {
                    weaveId: { type: 'string', description: 'Target weave ID' },
                    threadId: { type: 'string', description: 'Target thread ID' },
                    title: { type: 'string', description: 'Optional title for the req doc' },
                    context_ids: { type: 'array', items: { type: 'string' }, description: 'Optional. Additional doc IDs to inject as context.' },
                },
                required: ['weaveId', 'threadId'],
            },
            async (root, args) => {
                const weaveId = args['weaveId'] as string;
                const threadId = args['threadId'] as string;
                const title = args['title'] as string | undefined;
                const contextIds = Array.isArray(args['context_ids']) ? (args['context_ids'] as string[]) : [];

                const messages: SamplingMessage[] = [];
                try {
                    const ctx = await handleContextResource(root, `loom://context/thread/${weaveId}/${threadId}`);
                    messages.push(msg('user', `Thread context (the chat especially):\n\n${ctx.contents[0].text}`));
                } catch { /* best-effort */ }
                if (contextIds.length > 0) {
                    const extra = await loadExtraContext(root, contextIds);
                    if (extra) messages.push(msg('user', `Additional context:\n\n${extra}`));
                }
                messages.push(msg('user', [
                    'Extract the requirements the user has EXPLICITLY stated for this thread into a Loom req doc body.',
                    'Output ONLY markdown (no frontmatter) with exactly these three sections, in this order:',
                    '',
                    '### ✅ Included',
                    '### ❌ Excluded',
                    '### ⛓ Constraints',
                    '',
                    'Under each, write bullet points. PREFIX every bullet with an inline-code stable id:',
                    '- Included → `IN1`, `IN2`, …   Excluded → `EX1`, `EX2`, …   Constraints → `C1`, `C2`, …',
                    'Example:  - `EX1` **Interaction testing** — no manual smoke-test steps.',
                    '',
                    'Extract ONLY what the user explicitly stated — do NOT invent scope, and do NOT treat open questions as requirements.',
                    'Each ✅ Included item must be orthogonal and individually verifiable: do not restate one requirement from two angles, and do not add the overall outcome/thesis as an Included item (that is the goal, not a deliverable). Prefer fewer, sharper items over many overlapping ones.',
                    'If a section has no stated items, leave it empty (keep the heading).',
                ].join('\n')));

                const body = await requestSampling(
                    server,
                    messages,
                    'You are a Loom requirements extractor. Faithfully pull the stated includes/excludes/constraints from the conversation; never invent scope.',
                );

                const { id, filePath } = await createReq(
                    { weaveId, threadId, title, content: body },
                    { getActiveLoomRoot: () => getActiveLoomRoot(root), saveDoc, loadDoc, fs: fsExtra },
                );

                return { id, filePath };
            }
        ),

        makeTool(
            'loom_generate_chat_reply',
            'Generate an AI reply for a Loom chat document using sampling. Appends the reply under "## AI:". Requires sampling support from the MCP client.',
            {
                type: 'object' as const,
                properties: {
                    chatId: { type: 'string', description: 'Chat document ID' },
                },
                required: ['chatId'],
            },
            async (root, args) => {
                const chatId = args['chatId'] as string;

                // Primary (agent-supplied) id → suggest-on-miss.
                const { filePath } = await resolveDocIdOrThrow(root, chatId);

                const chatContent = await fsExtra.readFile(filePath, 'utf8');

                const reply = await requestSampling(
                    server,
                    [msg('user', chatContent)],
                    `You are an AI assistant in a Loom design chat. This is a DISCUSSION surface only.

RULES — strictly enforced:
- Do NOT promise to implement anything. Never say "let me find X", "I'll update Y", "I'll check Z", "Let me look at the code", or any phrase that implies you are about to act.
- Do NOT write code changes, file edits, or reference specific lines as if about to modify them.
- Your role is to think through the problem, discuss design options, and identify what work is needed.
- If implementation is needed, say so explicitly and suggest the user promote this chat to a plan so that a DoStep can carry it out.
- Write a focused, constructive response that advances the conversation.`
                );

                // Route the write through loom_append_to_chat so chat mutations
                // funnel through one code path (no direct file writes here).
                await appendToChatHandle(root, { id: chatId, role: 'ai', body: reply });

                return { id: chatId, filePath };
            }
        ),
    ];
}
