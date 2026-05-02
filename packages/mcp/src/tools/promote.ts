import * as fs from 'fs-extra';
import { Server } from '@modelcontextprotocol/sdk/server/index.js';
import { loadDoc, saveDoc, findDocumentById } from '../../../fs/dist';
import { promoteToIdea } from '../../../app/dist/promoteToIdea';
import { promoteToDesign } from '../../../app/dist/promoteToDesign';
import { promoteToPlan } from '../../../app/dist/promoteToPlan';
import { samplingAiClient } from '../samplingAiClient';

const toolDef = {
    name: 'loom_promote',
    description: 'Promote a document to a new type (idea, design, or plan). Creates a new doc linked to the source. Uses MCP sampling for AI generation.',
    inputSchema: {
        type: 'object' as const,
        properties: {
            sourceId: { type: 'string', description: 'Source document id' },
            targetType: { type: 'string', enum: ['idea', 'design', 'plan'], description: 'Target document type' },
        },
        required: ['sourceId', 'targetType'],
    },
};

export function createPromoteTool(server: Server) {
    return {
        toolDef,
        async handle(root: string, args: Record<string, unknown>) {
            const sourceId = args['sourceId'] as string;
            const targetType = args['targetType'] as 'idea' | 'design' | 'plan';

            const filePath = await findDocumentById(root, sourceId);
            if (!filePath) {
                throw new Error(`Source document not found: ${sourceId}`);
            }

            const deps = { loadDoc, saveDoc, fs, aiClient: samplingAiClient(server), loomRoot: root };

            let result: { filePath: string; title: string };
            if (targetType === 'idea') {
                result = await promoteToIdea({ filePath }, deps);
            } else if (targetType === 'design') {
                result = await promoteToDesign({ filePath }, deps);
            } else {
                result = await promoteToPlan({ filePath }, deps);
            }

            return { content: [{ type: 'text' as const, text: JSON.stringify(result) }] };
        },
    };
}
