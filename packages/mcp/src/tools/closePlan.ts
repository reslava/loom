import * as fs from 'fs-extra';
import { loadWeave, saveDoc } from '../../../fs/dist';
import { closePlan as closePlanUseCase } from '../../../app/dist/closePlan';

export const toolDef = {
    name: 'loom_close_plan',
    description: 'Finalize a completed plan: run the FINISH_PLAN transition and persist it. The done-doc body is authored per step via loom_append_done — this tool does NOT generate it. Optionally pass a notes string, written VERBATIM into the done doc (appended as a closing section if a done doc already exists, or used as the body if none does). Closing a plan that has neither notes nor an existing done doc throws — it never writes a placeholder stub. Use this tool to close plans — do not edit plan files directly.',
    inputSchema: {
        type: 'object' as const,
        properties: {
            planId: { type: 'string', description: 'Plan id to close' },
            notes: { type: 'string', description: 'Optional closing notes, written verbatim into the done doc' },
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
        loomRoot: root,
    });

    return { content: [{ type: 'text' as const, text: JSON.stringify(result) }] };
}
