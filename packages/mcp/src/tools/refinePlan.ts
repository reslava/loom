import { Server } from '@modelcontextprotocol/sdk/server/index.js';
import { loadDoc, saveDoc, findDocumentById } from '../../../fs/dist';
import { refinePlan } from '../../../app/dist/refinePlan';
import { samplingAiClient } from '../samplingAiClient';

const toolDef = {
    name: 'loom_refine_plan',
    description: 'Refine an existing Loom plan document using MCP sampling. Re-evaluates steps, sharpens descriptions, bumps version.',
    inputSchema: {
        type: 'object' as const,
        properties: {
            id: { type: 'string', description: 'Plan document id to refine' },
        },
        required: ['id'],
    },
};

export function createRefinePlanTool(server: Server) {
    return {
        toolDef,
        async handle(root: string, args: Record<string, unknown>) {
            const id = args['id'] as string;
            const filePath = await findDocumentById(root, id);
            if (!filePath) {
                throw new Error(`Plan document not found: ${id}`);
            }
            const result = await refinePlan(
                { filePath },
                { loadDoc, saveDoc, aiClient: samplingAiClient(server) }
            );
            return { content: [{ type: 'text' as const, text: JSON.stringify(result) }] };
        },
    };
}
