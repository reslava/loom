import { Server } from '@modelcontextprotocol/sdk/server/index.js';
import { loadDoc, saveDoc, resolveDocIdOrThrow } from '../../../fs/dist';
import { refinePlan } from '../../../app/dist/refinePlan';
import { samplingAiClient } from '../samplingAiClient';
import { buildRefineExtraContext } from './refineContext';

const toolDef = {
    name: 'loom_refine_plan',
    description: 'Refine an existing Loom plan document using MCP sampling. Re-evaluates steps, sharpens descriptions, bumps version.',
    inputSchema: {
        type: 'object' as const,
        properties: {
            id: { type: 'string', description: 'Plan document id to refine' },
            context_ids: { type: 'array', items: { type: 'string' }, description: 'Optional. Additional doc IDs to inject as extra context before refining.' },
        },
        required: ['id'],
    },
};

export function createRefinePlanTool(server: Server) {
    return {
        toolDef,
        async handle(root: string, args: Record<string, unknown>) {
            const id = args['id'] as string;
            const contextIds = Array.isArray(args['context_ids']) ? (args['context_ids'] as string[]) : [];
            // Primary (agent-supplied) id → suggest-on-miss.
            const { id: canonicalId, filePath } = await resolveDocIdOrThrow(root, id);

            // Inject the thread's Unified Context bundle (locked req first) plus any
            // caller context_ids, so refine is req-aware. IO stays in the mcp layer.
            const extraContext = await buildRefineExtraContext(root, canonicalId, contextIds);

            const result = await refinePlan(
                { filePath, extraContext },
                { loadDoc, saveDoc, aiClient: samplingAiClient(server) }
            );
            return { content: [{ type: 'text' as const, text: JSON.stringify(result) }] };
        },
    };
}
