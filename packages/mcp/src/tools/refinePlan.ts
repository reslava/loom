import { Server } from '@modelcontextprotocol/sdk/server/index.js';
import { loadDoc, saveDoc, findDocumentById, resolveDocIdOrThrow } from '../../../fs/dist';
import { refinePlan } from '../../../app/dist/refinePlan';
import { samplingAiClient } from '../samplingAiClient';
import { Document } from '../../../core/dist';

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
            // Primary (agent-supplied) id → suggest-on-miss. The context_ids lookups
            // below stay on findDocumentById (best-effort enrichment).
            const { filePath } = await resolveDocIdOrThrow(root, id);

            let extraContext: string | undefined;
            if (contextIds.length > 0) {
                const parts = await Promise.all(
                    contextIds.map(async (cid) => {
                        try {
                            const fp = await findDocumentById(root, cid);
                            if (!fp) return null;
                            const doc = await loadDoc(fp) as Document;
                            return `### ${doc.title} (${doc.type})\n\n${(doc as any).content ?? ''}`;
                        } catch { return null; }
                    })
                );
                const joined = parts.filter(Boolean).join('\n\n---\n\n');
                if (joined) extraContext = joined;
            }

            const result = await refinePlan(
                { filePath, extraContext },
                { loadDoc, saveDoc, aiClient: samplingAiClient(server) }
            );
            return { content: [{ type: 'text' as const, text: JSON.stringify(result) }] };
        },
    };
}
