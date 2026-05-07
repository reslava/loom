import * as fsExtra from 'fs-extra';
import { Server } from '@modelcontextprotocol/sdk/server/index.js';
import { getActiveLoomRoot, saveDoc, loadDoc, findDocumentById, loadWeave } from '../../../fs/dist';
import { Document } from '../../../core/dist';
import { weaveIdea } from '../../../app/dist/weaveIdea';
import { weaveDesign } from '../../../app/dist/weaveDesign';
import { weavePlan } from '../../../app/dist/weavePlan';
import { handleThreadContextResource } from '../resources/threadContext';
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
                    const ctx = await handleThreadContextResource(root, `loom://thread-context/${weaveId}/${threadId}`);
                    messages.push(msg('user', `Thread context:\n\n${ctx.contents[0].text}`));
                } catch { /* best-effort */ }
                if (contextIds.length > 0) {
                    const extra = await loadExtraContext(root, contextIds);
                    if (extra) messages.push(msg('user', `Additional context:\n\n${extra}`));
                }
                messages.push(msg('user', `Draft a Loom design document titled "${title}". Write only the markdown body — no frontmatter. Include architecture, components, data flow, key decisions, and open questions.`));

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
                    const ctx = await handleThreadContextResource(root, `loom://thread-context/${weaveId}/${threadId}`);
                    messages.push(msg('user', `Thread context:\n\n${ctx.contents[0].text}`));
                } catch { /* best-effort */ }
                if (contextIds.length > 0) {
                    const extra = await loadExtraContext(root, contextIds);
                    if (extra) messages.push(msg('user', `Additional context:\n\n${extra}`));
                }
                messages.push(msg('user', [
                    `Generate an implementation plan for "${title}".`,
                    'Return ONLY a JSON array of steps — no prose, no markdown fences:',
                    '[{"order":1,"description":"..."},{"order":2,"description":"..."}]',
                ].join('\n')));

                const generated = await requestSampling(
                    server,
                    messages,
                    'You are a Loom document author. Output ONLY valid JSON arrays for implementation plans.',
                    8192
                );

                let steps: Array<{ order: number; description: string }> = [];
                try {
                    const jsonMatch = generated.match(/\[[\s\S]*\]/);
                    if (jsonMatch) steps = JSON.parse(jsonMatch[0]);
                } catch {
                    steps = [{ order: 1, description: `Generated plan:\n\n${generated}` }];
                }

                const { id, filePath } = await weavePlan(
                    { weaveId, title, threadId },
                    { loadWeave, saveDoc, loadDoc, fs: fsExtra, loomRoot: root }
                );

                return { id, filePath, steps };
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

                const filePath = await findDocumentById(root, chatId);
                if (!filePath) throw new Error(`Chat not found: ${chatId}`);

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
                await appendToChatHandle(root, { id: chatId, role: 'AI', body: reply });

                return { id: chatId, filePath };
            }
        ),
    ];
}
