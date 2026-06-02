import { resolveDocIdOrThrow, loadDoc } from '../../../fs/dist';
import { PlanDoc } from '../../../core/dist/entities/plan';

export const toolDef = {
    name: 'loom_list_plan_steps',
    description: 'List the steps of a plan with their done status, files, description, and in-plan blockers. Pure read. Used by clients to compute which steps are doable, which are blocked, and to render multi-step pickers.',
    inputSchema: {
        type: 'object' as const,
        properties: {
            planId: { type: 'string', description: 'Plan id. Canonical form is the ULID (e.g. "pl_01J…"); the filename stem (e.g. "my-weave-plan-001") is also accepted and resolved.' },
        },
        required: ['planId'],
    },
};

export async function handle(root: string, args: Record<string, unknown>) {
    const planId = args['planId'] as string;

    // Primary (agent-supplied) id → suggest-on-miss.
    const { filePath: planFilePath } = await resolveDocIdOrThrow(root, planId);

    const planDoc = await loadDoc(planFilePath) as PlanDoc;
    if (planDoc.type !== 'plan') throw new Error(`Document ${planId} is not a plan`);

    const steps = (planDoc.steps ?? []).map(s => ({
        order: s.order,
        description: s.description,
        filesToTouch: s.files_touched,
        done: s.done,
        blockedBy: s.blockedBy ?? [],
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
