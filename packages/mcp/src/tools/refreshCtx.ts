import * as path from 'path';
import * as fsExtra from 'fs-extra';
import { Server } from '@modelcontextprotocol/sdk/server/index.js';
import { handleContextResource } from '../resources/context';
import { requestSampling } from '../sampling';

function makeCtxId(weaveId: string, threadId: string | undefined): string {
    const base = threadId ? `${threadId}-ctx` : `${weaveId}-ctx`;
    const date = new Date().toISOString().split('T')[0].replace(/-/g, '');
    return `${base}-${date}`;
}

export function createRefreshCtxTool(server: Server) {
    return {
        toolDef: {
            name: 'loom_refresh_ctx',
            description: 'Regenerate a thread context summary using AI sampling. Loads idea + design + active plan and asks the host agent for a summary. Saves to {thread}/ctx/{id}.md. Requires sampling support.',
            inputSchema: {
                type: 'object' as const,
                properties: {
                    weaveId: { type: 'string', description: 'Weave ID' },
                    threadId: { type: 'string', description: 'Thread ID (optional — omit for weave-level ctx)' },
                },
                required: ['weaveId'],
            },
        },
        handle: async (root: string, args: Record<string, unknown>) => {
            const weaveId = args['weaveId'] as string;
            const threadId = args['threadId'] as string | undefined;

            const messages: Array<{ role: 'user' | 'assistant'; content: { type: 'text'; text: string } }> = [];

            if (threadId) {
                try {
                    const ctx = await handleContextResource(root, `loom://context/thread/${weaveId}/${threadId}?mode=ctx`);
                    messages.push({ role: 'user', content: { type: 'text', text: `Thread documents:\n\n${ctx.contents[0].text}` } });
                } catch (e: any) {
                    throw new Error(`Could not load thread context for ${weaveId}/${threadId}: ${e.message}`);
                }
            }

            messages.push({
                role: 'user',
                content: {
                    type: 'text',
                    text: 'Write a concise context summary for this thread. Cover: (1) what the thread is about, (2) current status, (3) active plan and next steps, (4) key decisions made so far. Write in plain markdown, 200–400 words.',
                },
            });

            const summary = await requestSampling(
                server,
                messages,
                'You are a Loom context summarizer. Write clear, structured context summaries for AI agents.'
            );

            const ctxId = makeCtxId(weaveId, threadId);
            const ctxDir = threadId
                ? path.join(root, 'loom', weaveId, threadId, 'ctx')
                : path.join(root, 'loom', weaveId, 'ctx');

            await fsExtra.ensureDir(ctxDir);

            const today = new Date().toISOString().split('T')[0];
            const frontmatter = [
                '---',
                `type: ctx`,
                `id: ${ctxId}`,
                `title: "Context Summary"`,
                `status: active`,
                `created: ${today}`,
                `version: 1`,
                `tags: []`,
                `parent_id: null`,
                `child_ids: []`,
                `requires_load: []`,
                '---',
                '',
            ].join('\n');

            const filePath = path.join(ctxDir, `${ctxId}.md`);
            await fsExtra.writeFile(filePath, `${frontmatter}${summary}`, 'utf8');

            return { content: [{ type: 'text' as const, text: JSON.stringify({ ctxId, filePath }) }] };
        },
    };
}
