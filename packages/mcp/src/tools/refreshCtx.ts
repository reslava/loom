import * as path from 'path';
import * as fsExtra from 'fs-extra';
import { Server } from '@modelcontextprotocol/sdk/server/index.js';
import { handleStateResource } from '../resources/state';
import { requestSampling } from '../sampling';

export function createRefreshCtxTool(server: Server) {
    return {
        toolDef: {
            name: 'loom_refresh_ctx',
            description: 'Regenerate a weave context summary using AI sampling. Loads the workspace state and asks the host agent to summarise the named weave. Saves to loom/{weaveId}/ctx.md (id {weaveId}-ctx, overwrites). ctx exists at global + weave scope only — there is no thread ctx. Requires sampling support.',
            inputSchema: {
                type: 'object' as const,
                properties: {
                    weaveId: { type: 'string', description: 'Weave ID' },
                },
                required: ['weaveId'],
            },
        },
        handle: async (root: string, args: Record<string, unknown>) => {
            const weaveId = args['weaveId'] as string;

            const stateResult = await handleStateResource(root, 'loom://state?status=active,implementing');
            const stateText = stateResult.contents[0]?.text ?? '{}';

            const messages: Array<{ role: 'user' | 'assistant'; content: { type: 'text'; text: string } }> = [
                {
                    role: 'user',
                    content: {
                        type: 'text',
                        text: `Workspace state JSON:\n\n${stateText}\n\nWrite a concise context summary for the weave "${weaveId}". Cover: (1) what the weave is about, (2) its threads and their status, (3) active plans and next steps, (4) key decisions made so far. Plain markdown, 200–400 words.`,
                    },
                },
            ];

            const summary = await requestSampling(
                server,
                messages,
                'You are a Loom context summarizer. Write clear, structured context summaries for AI agents.'
            );

            const ctxId = `${weaveId}-ctx`;
            const today = new Date().toISOString().split('T')[0];
            const frontmatter = [
                '---',
                'type: ctx',
                `id: ${ctxId}`,
                `title: "Context Summary — ${weaveId}"`,
                'status: active',
                `created: ${today}`,
                'version: 1',
                'tags: [ctx, summary]',
                'parent_id: null',
                'child_ids: []',
                'requires_load: []',
                '---',
                '',
            ].join('\n');

            const filePath = path.join(root, 'loom', weaveId, 'ctx.md');
            await fsExtra.ensureDir(path.dirname(filePath));
            await fsExtra.writeFile(filePath, `${frontmatter}${summary}`, 'utf8');

            return { content: [{ type: 'text' as const, text: JSON.stringify({ ctxId, filePath }) }] };
        },
    };
}
