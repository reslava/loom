import { loadWeave, saveWeave } from '../../../fs/dist';
import { runEvent } from '../../../app/dist/runEvent';
import { completeStep as completeStepUseCase } from '../../../app/dist/completeStep';

export const toolDef = {
    name: 'loom_complete_step',
    description: 'Mark a plan step as done. Call only on plans with status "implementing". Idempotent if the step is already done. Use this tool to mark steps complete — do not edit plan files directly.',
    inputSchema: {
        type: 'object' as const,
        properties: {
            planId: { type: 'string', description: 'Plan id (e.g. "my-weave-plan-001")' },
            stepNumber: { type: 'number', description: 'Step number (1-based)' },
        },
        required: ['planId', 'stepNumber'],
    },
};

export async function handle(root: string, args: Record<string, unknown>) {
    const planId = args['planId'] as string;
    const stepNumber = args['stepNumber'] as number;

    const loadWeaveStrict = async (r: string, w: string) => {
        const result = await loadWeave(r, w);
        if (!result) throw new Error(`Weave not found: ${w}`);
        return result;
    };
    const deps = {
        loadWeave: loadWeaveStrict,
        runEvent: (weaveId: string, event: any) =>
            runEvent(weaveId, event, { loadWeave: loadWeaveStrict, saveWeave, loomRoot: root }),
        loomRoot: root,
    };

    const result = await completeStepUseCase({ planId, step: stepNumber }, deps);
    return { content: [{ type: 'text' as const, text: JSON.stringify(result) }] };
}
