import * as fs from 'fs-extra';
import { loadWeave, saveDoc } from '../../../fs/dist';
import { closePlan as closePlanUseCase } from '../../../app/dist/closePlan';
import { requirePlanUlid } from './planUlid';

export const toolDef = {
    name: 'loom_close_plan',
    description: 'Finalize a completed plan: run the FINISH_PLAN transition and persist it. The done-doc body is authored per step via loom_append_done — this tool does NOT generate it. Optionally pass a notes string, written VERBATIM into the done doc (appended as a closing section if a done doc already exists, or used as the body if none does). Closing a plan that has neither notes nor an existing done doc throws — it never writes a placeholder stub. Use this tool to close plans — do not edit plan files directly.',
    inputSchema: {
        type: 'object' as const,
        properties: {
            plan_ulid: { type: 'string', description: 'Plan\'s stable pl_ ULID to close (e.g. "pl_01J…"). ULID only — a filename stem or title is rejected.' },
            notes: { type: 'string', description: 'Optional closing notes, written verbatim into the done doc' },
        },
        required: ['plan_ulid'],
    },
};

export async function handle(root: string, args: Record<string, unknown>) {
    const planUlid = requirePlanUlid(args);
    const notes = args['notes'] as string | undefined;

    const result = await closePlanUseCase({ planUlid, notes }, {
        loadWeave,
        saveDoc,
        fs,
        loomRoot: root,
    });

    return { content: [{ type: 'text' as const, text: JSON.stringify(result) }] };
}
