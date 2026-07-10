import { loadWeave, saveDocs } from '../../../fs/dist';
import { runEvent } from '../../../app/dist/runEvent';
import { removeStep as removeStepUseCase } from '../../../app/dist/removeStep';
import { requirePlanUlid } from './planUlid';

export const toolDef = {
    name: 'loom_remove_step',
    description: 'Remove a pending step from a plan by its stable id. Rejects a done/cancelled step (immutable history). Strips any blockedBy references to the removed step from the surviving steps (no dangling blocker) and reports which steps were re-threaded; recomputes order and prunes the step\'s body detail section. Allowed on draft/active/implementing/blocked plans. Use this tool to remove steps — do not edit plan files directly.',
    inputSchema: {
        type: 'object' as const,
        properties: {
            plan_ulid: { type: 'string', description: 'Plan\'s stable pl_ ULID (e.g. "pl_01J…"). ULID only — a filename stem or title is rejected.' },
            stepId: { type: 'string', description: 'The stable id of the step to remove (the `id` field in the steps frontmatter).' },
        },
        required: ['plan_ulid', 'stepId'],
    },
};

export async function handle(root: string, args: Record<string, unknown>) {
    const planUlid = requirePlanUlid(args);
    const stepId = args['stepId'] as string;

    const loadWeaveStrict = async (r: string, w: string) => {
        const result = await loadWeave(r, w);
        if (!result) throw new Error(`Weave not found: ${w}`);
        return result;
    };
    const deps = {
        loadWeave: loadWeaveStrict,
        runEvent: (weaveSlug: string, event: any) =>
            runEvent(weaveSlug, event, { loadWeave: loadWeaveStrict, saveDocs, loomRoot: root }),
        loomRoot: root,
    };

    const result = await removeStepUseCase({ planUlid, stepId }, deps);
    return { content: [{ type: 'text' as const, text: JSON.stringify(result) }] };
}
