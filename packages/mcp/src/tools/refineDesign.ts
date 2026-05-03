import { Server } from '@modelcontextprotocol/sdk/server/index.js';
import { loadDoc, saveDoc, findDocumentById } from '../../../fs/dist';
import { refineDesign } from '../../../app/dist/refineDesign';
import { samplingAiClient } from '../samplingAiClient';

const toolDef = {
    name: 'loom_refine_design',
    description: 'Refine an existing Loom design document using MCP sampling. Sharpens goal, architecture and decisions; bumps version.',
    inputSchema: {
        type: 'object' as const,
        properties: {
            id: { type: 'string', description: 'Design document id to refine' },
        },
        required: ['id'],
    },
};

export function createRefineDesignTool(server: Server) {
    return {
        toolDef,
        async handle(root: string, args: Record<string, unknown>) {
            const id = args['id'] as string;
            const filePath = await findDocumentById(root, id);
            if (!filePath) {
                throw new Error(`Design document not found: ${id}`);
            }
            const result = await refineDesign(
                { filePath },
                { loadDoc, saveDoc, aiClient: samplingAiClient(server) }
            );
            return { content: [{ type: 'text' as const, text: JSON.stringify(result) }] };
        },
    };
}
