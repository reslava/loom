import * as fs from 'fs-extra';
import { loadWeave, saveDoc } from '../../../fs/dist';
import { closePlan as closePlanUseCase } from '../../../app/dist/closePlan';
import { AIClient } from '../../../core/dist';

function makeStubAiClient(notes?: string): AIClient {
    return {
        complete: async () =>
            notes?.trim() ||
            'TODO: Add implementation notes.\n\n(AI generation requires MCP sampling — Phase 8.)',
    };
}

export const toolDef = {
    name: 'loom_close_plan',
    description: 'Close a completed plan and create a done doc. Optionally provide a notes string to use as the done doc body (otherwise a placeholder is generated). Use this tool to close plans — do not edit plan files directly.',
    inputSchema: {
        type: 'object' as const,
        properties: {
            planId: { type: 'string', description: 'Plan id to close' },
            notes: { type: 'string', description: 'Optional implementation notes for the done doc body' },
        },
        required: ['planId'],
    },
};

export async function handle(root: string, args: Record<string, unknown>) {
    const planId = args['planId'] as string;
    const notes = args['notes'] as string | undefined;

    const result = await closePlanUseCase({ planId, notes }, {
        loadWeave,
        saveDoc,
        fs,
        aiClient: makeStubAiClient(notes),
        loomRoot: root,
    });

    return { content: [{ type: 'text' as const, text: JSON.stringify(result) }] };
}
