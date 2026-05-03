import * as fsExtra from 'fs-extra';
import { Server } from '@modelcontextprotocol/sdk/server/index.js';
import { loadWeave, getActiveLoomRoot } from '../../../fs/dist';
import { summarise } from '../../../app/dist/summarise';
import { samplingAiClient } from '../samplingAiClient';

const toolDef = {
    name: 'loom_summarise',
    description: 'Generate or refresh a weave-level context summary at loom/{weaveId}/{weaveId}-ctx.md using MCP sampling. Idempotent: skips when source design version unchanged unless force=true.',
    inputSchema: {
        type: 'object' as const,
        properties: {
            weaveId: { type: 'string', description: 'Weave id to summarise' },
            force: { type: 'boolean', description: 'Regenerate even if source design version is unchanged' },
        },
        required: ['weaveId'],
    },
};

export function createSummariseTool(server: Server) {
    return {
        toolDef,
        async handle(root: string, args: Record<string, unknown>) {
            const weaveId = args['weaveId'] as string;
            const force = Boolean(args['force']);

            const result = await summarise(
                { weaveId, force },
                {
                    loadWeave,
                    getActiveLoomRoot: () => getActiveLoomRoot(root),
                    fs: fsExtra,
                    loomRoot: root,
                    aiClient: samplingAiClient(server),
                }
            );
            return { content: [{ type: 'text' as const, text: JSON.stringify(result) }] };
        },
    };
}
