import { loadWeave, saveDocs } from '../../../fs/dist';
import { runEvent } from '../../../app/dist/runEvent';
import { reorderSteps as reorderStepsUseCase } from '../../../app/dist/reorderSteps';
import { requirePlanUlid } from './planUlid';

export const toolDef = {
    name: 'loom_reorder_steps',
    description: 'Reorder a plan\'s steps. Pass orderedStepIds as the full set of the plan\'s step ids in the new order (a permutation — no adds/drops). blockedBy references survive (they point at ids). Done/cancelled steps must stay the leading block in their original order — only pending work reorders. Use this tool to reorder steps — do not edit plan files directly.',
    inputSchema: {
        type: 'object' as const,
        properties: {
            plan_ulid: { type: 'string', description: 'Plan\'s stable pl_ ULID (e.g. "pl_01J…"). ULID only — a filename stem or title is rejected.' },
            orderedStepIds: { type: 'array', items: { type: 'string' }, description: 'Every step id of the plan, in the desired new order.' },
        },
        required: ['plan_ulid', 'orderedStepIds'],
    },
};

export async function handle(root: string, args: Record<string, unknown>) {
    const planUlid = requirePlanUlid(args);
    const orderedStepIds = (args['orderedStepIds'] as string[]) ?? [];

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

    const result = await reorderStepsUseCase({ planUlid, orderedStepIds }, deps);
    return { content: [{ type: 'text' as const, text: JSON.stringify(result) }] };
}
