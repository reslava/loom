import * as path from 'path';
import { loadWeave, saveDocs, resolveDocIdOrThrow } from '../../../fs/dist';
import { runEvent } from '../../../app/dist/runEvent';
import { requirePlanUlid } from './planUlid';

export const toolDef = {
    name: 'loom_start_plan',
    description: 'Transition a plan to status "implementing". Call only on plans with status "draft" or "active". Use this tool to start a plan — do not edit plan files directly.',
    inputSchema: {
        type: 'object' as const,
        properties: {
            plan_ulid: { type: 'string', description: 'Plan\'s stable pl_ ULID (e.g. "pl_01J…"). ULID only — a filename stem or title is rejected.' },
        },
        required: ['plan_ulid'],
    },
};

export async function handle(root: string, args: Record<string, unknown>) {
    const planKey = requirePlanUlid(args);
    // Resolve filename-stems / typos to the canonical plan id (with suggest-on-miss),
    // then derive the weave from the resolved path.
    const { id: planId, filePath } = await resolveDocIdOrThrow(root, planKey);
    const weaveId = path.relative(path.join(root, 'loom'), filePath).split(path.sep)[0];

    const loadWeaveStrict = async (r: string, w: string) => {
        const result = await loadWeave(r, w);
        if (!result) throw new Error(`Weave not found: ${w}`);
        return result;
    };
    const deps = { loadWeave: loadWeaveStrict, saveDocs, loomRoot: root };
    const updatedWeave = await runEvent(weaveId, { type: 'START_IMPLEMENTING_PLAN', planId } as any, deps);
    const plan = updatedWeave.threads.flatMap(t => t.plans).find(p => p.id === planId);

    return { content: [{ type: 'text' as const, text: JSON.stringify({ planId, status: plan?.status ?? 'implementing' }) }] };
}
