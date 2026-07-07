import { resolveDocIdOrThrow, loadDoc } from '../../../fs/dist';
import { handleContextResource } from '../resources/context';
import { isPlanUlid } from '../tools/planUlid';

export const promptDef = {
    name: 'do-next-step',
    description: 'Load plan and thread context, return an instruction to implement the next incomplete step.',
    arguments: [
        { name: 'planUlid', description: 'Plan ULID (e.g. "pl_01J…").', required: true },
    ],
};

export async function handle(root: string, args: Record<string, string | undefined>) {
    const planUlid = args['planUlid'];
    if (!planUlid) throw new Error('planUlid is required');
    // Strict, ULID-only — matches the plan-step tools' requirePlanUlid contract.
    // A filename stem or title is rejected here; the CLI resolves any friendly
    // reference to a pl_ ULID at its own edge (see next.ts resolvePlanUlid) before
    // calling this prompt.
    if (!isPlanUlid(planUlid)) {
        throw new Error(
            `planUlid must be a plan's stable pl_ ULID (e.g. "pl_01J…"), not a filename stem or title. Got: ${JSON.stringify(planUlid)}.`,
        );
    }

    // ULID → file path.
    const { filePath } = await resolveDocIdOrThrow(root, planUlid);

    const plan = await loadDoc(filePath);
    if (plan.type !== 'plan') throw new Error(`Document ${planUlid} is not a plan`);

    // Find first incomplete step
    const steps: Array<{ id?: string; order?: number; description?: string; status?: string }> =
        (plan as any).steps ?? [];
    const nextStep = steps.find(s => s.status !== 'done' && s.status !== 'cancelled');

    const messages: Array<{ role: 'user' | 'assistant'; content: { type: 'text'; text: string } }> = [];

    // Unified context pipeline: bundles global/weave/thread ctx + the plan's
    // parent chain + the plan itself (as target) + requires_load. Replaces the
    // old ad-hoc thread-context + separate plan-content push.
    try {
        const ctx = await handleContextResource(root, `loom://context/${planUlid}?mode=implementing`);
        messages.push({ role: 'user', content: { type: 'text', text: ctx.contents[0].text } });
    } catch { /* context is best-effort */ }

    const instruction = nextStep
        ? [
            `Implement step ${nextStep.order ?? '?'}${nextStep.id ? ` (id: ${nextStep.id})` : ''}: ${nextStep.description}`,
            '',
            `After completing this step, call loom_complete_step with plan_ulid="${planUlid}" and stepNumber=${nextStep.order}.`,
        ].join('\n')
        : `All steps are complete in plan ${planUlid}. You may close it using loom_close_plan.`;

    messages.push({ role: 'user', content: { type: 'text', text: instruction } });

    return {
        description: nextStep
            ? `Implement step ${nextStep.order} of ${planUlid}: ${nextStep.description}`
            : `All steps complete in ${planUlid}`,
        messages,
    };
}
