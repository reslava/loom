import { resolveDocIdOrThrow, loadDoc } from '../../../fs/dist';
import { PlanDoc } from '../../../core/dist/entities/plan';
import { requirePlanUlid } from './planUlid';

export const toolDef = {
    name: 'loom_list_plan_steps',
    description: 'List the steps of a plan with their stable id, status, files, description, in-plan blockers, and req citations. Pure read. Used by clients to compute which steps are doable, which are blocked, and to render multi-step pickers. `blockedBy` entries reference step `id`s (or plan ids).',
    inputSchema: {
        type: 'object' as const,
        properties: {
            plan_ulid: { type: 'string', description: 'Plan\'s stable pl_ ULID (e.g. "pl_01J…"). ULID only — a filename stem or title is rejected.' },
        },
        required: ['plan_ulid'],
    },
};

export async function handle(root: string, args: Record<string, unknown>) {
    const planId = requirePlanUlid(args);

    // Primary (agent-supplied) id → suggest-on-miss.
    const { filePath: planFilePath } = await resolveDocIdOrThrow(root, planId);

    const planDoc = await loadDoc(planFilePath) as PlanDoc;
    if (planDoc.type !== 'plan') throw new Error(`Document ${planId} is not a plan`);

    const steps = (planDoc.steps ?? []).map(s => ({
        id: s.id,
        order: s.order,
        description: s.description,
        filesToTouch: s.files_touched,
        done: s.status === 'done',
        status: s.status,
        blockedBy: s.blockedBy ?? [],
        // The req-citation contract: the IN/C ids this step advances. Surfaced so
        // pickers can render coverage where steps are shown (not just in Verify).
        satisfies: s.satisfies ?? [],
    }));

    const result = {
        planId,
        planTitle: planDoc.title,
        planStatus: planDoc.status,
        steps,
    };

    return {
        content: [{
            type: 'text' as const,
            text: JSON.stringify(result, null, 2),
        }],
    };
}
