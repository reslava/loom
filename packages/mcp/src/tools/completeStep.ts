import { loadWeave, saveDocs } from '../../../fs/dist';
import { runEvent } from '../../../app/dist/runEvent';
import { completeStep as completeStepUseCase } from '../../../app/dist/completeStep';

export const toolDef = {
    name: 'loom_complete_step',
    description: 'Mark a plan step as done. Call only on plans with status "implementing". Idempotent if the step is already done. Use this tool to mark steps complete — do not edit plan files directly.',
    inputSchema: {
        type: 'object' as const,
        properties: {
            planId: { type: 'string', description: 'Plan id. Canonical form is the ULID (e.g. "pl_01J…"); the filename stem (e.g. "my-weave-plan-001") is also accepted and resolved.' },
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
            runEvent(weaveId, event, { loadWeave: loadWeaveStrict, saveDocs, loomRoot: root }),
        loomRoot: root,
    };

    const { plan, autoCompleted } = await completeStepUseCase({ planId, step: stepNumber }, deps);

    // Stopgap: do not echo the whole PlanDoc back on every call (redundant across a
    // multi-step session — the agent already holds the plan). Return a reference plus
    // the changed step and a compact status line for the rest.
    const completedStep = (plan.steps ?? []).find(s => s.order === stepNumber);
    const trimmed = {
        planId: plan.id,
        planStatus: plan.status,
        autoCompleted,
        completedStep: completedStep
            ? { order: completedStep.order, status: completedStep.status, description: completedStep.description }
            : { order: stepNumber, status: 'done' },
        steps: (plan.steps ?? []).map(s => ({ order: s.order, status: s.status })),
    };
    return { content: [{ type: 'text' as const, text: JSON.stringify(trimmed) }] };
}
