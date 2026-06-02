import * as path from 'path';
import { loadWeave, saveDocs, resolveDocIdOrThrow } from '../../../fs/dist';
import { runEvent } from '../../../app/dist/runEvent';

export const toolDef = {
    name: 'loom_start_plan',
    description: 'Transition a plan to status "implementing". Call only on plans with status "draft" or "active". Use this tool to start a plan — do not edit plan files directly.',
    inputSchema: {
        type: 'object' as const,
        properties: {
            planId: { type: 'string', description: 'Plan id. Canonical form is the ULID (e.g. "pl_01J…"); the filename stem (e.g. "my-weave-plan-001") is also accepted and resolved.' },
        },
        required: ['planId'],
    },
};

export async function handle(root: string, args: Record<string, unknown>) {
    const planKey = args['planId'] as string;
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
