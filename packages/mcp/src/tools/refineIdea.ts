import { Server } from '@modelcontextprotocol/sdk/server/index.js';
import { loadDoc, saveDoc, resolveDocIdOrThrow } from '../../../fs/dist';
import { refineIdea } from '../../../app/dist/refineIdea';
import { samplingAiClient } from '../samplingAiClient';

const toolDef = {
    name: 'loom_refine_idea',
    description: 'Refine an existing Loom idea document using MCP sampling. Sharpens the problem statement, fills weak sections, bumps version.',
    inputSchema: {
        type: 'object' as const,
        properties: {
            id: { type: 'string', description: 'Idea document id to refine' },
        },
        required: ['id'],
    },
};

export function createRefineIdeaTool(server: Server) {
    return {
        toolDef,
        async handle(root: string, args: Record<string, unknown>) {
            const id = args['id'] as string;
            // Primary (agent-supplied) id → suggest-on-miss.
            const { filePath } = await resolveDocIdOrThrow(root, id);
            const result = await refineIdea(
                { filePath },
                { loadDoc, saveDoc, aiClient: samplingAiClient(server) }
            );
            return { content: [{ type: 'text' as const, text: JSON.stringify(result) }] };
        },
    };
}
