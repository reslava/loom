import { loadWeave, saveWeave } from '../../../fs/dist';
import { runEvent } from '../../../app/dist/runEvent';

export const toolDef = {
    name: 'loom_start_plan',
    description: 'Transition a plan to status "implementing". Call only on plans with status "draft" or "active". Use this tool to start a plan — do not edit plan files directly.',
    inputSchema: {
        type: 'object' as const,
        properties: {
            planId: { type: 'string', description: 'Plan id (e.g. "my-weave-plan-001")' },
        },
        required: ['planId'],
    },
};

export async function handle(root: string, args: Record<string, unknown>) {
    const planId = args['planId'] as string;
    const weaveId = planId.split('-plan-')[0];
    if (!weaveId) {
        throw new Error(`Invalid plan ID format. Expected "{weaveId}-plan-###", got "${planId}"`);
    }

    const loadWeaveStrict = async (r: string, w: string) => {
        const result = await loadWeave(r, w);
        if (!result) throw new Error(`Weave not found: ${w}`);
        return result;
    };
    const deps = { loadWeave: loadWeaveStrict, saveWeave, loomRoot: root };
    const updatedWeave = await runEvent(weaveId, { type: 'START_IMPLEMENTING_PLAN', planId } as any, deps);
    const plan = updatedWeave.threads.flatMap(t => t.plans).find(p => p.id === planId);

    return { content: [{ type: 'text' as const, text: JSON.stringify({ planId, status: plan?.status ?? 'implementing' }) }] };
}
