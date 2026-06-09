import { resolveDocIdOrThrow, loadDoc } from '../../../fs/dist';
import { handleContextResource } from '../resources/context';

export const promptDef = {
    name: 'do-next-step',
    description: 'Load plan and thread context, return an instruction to implement the next incomplete step.',
    arguments: [
        { name: 'planId', description: 'Plan id. Canonical form is the ULID (e.g. "pl_01J…"); the filename stem (e.g. "my-weave-plan-001") is also accepted and resolved.', required: true },
    ],
};

export async function handle(root: string, args: Record<string, string | undefined>) {
    const planId = args['planId'];
    if (!planId) throw new Error('planId is required');

    // Primary (agent-supplied) id → suggest-on-miss.
    const { filePath } = await resolveDocIdOrThrow(root, planId);

    const plan = await loadDoc(filePath);
    if (plan.type !== 'plan') throw new Error(`Document ${planId} is not a plan`);

    // Find first incomplete step
    const steps: Array<{ id?: string; order?: number; description?: string; status?: string }> =
        (plan as any).steps ?? [];
    const nextStep = steps.find(s => s.status !== 'done' && s.status !== 'cancelled');

    const messages: Array<{ role: 'user' | 'assistant'; content: { type: 'text'; text: string } }> = [];

    // Unified context pipeline: bundles global/weave/thread ctx + the plan's
    // parent chain + the plan itself (as target) + requires_load. Replaces the
    // old ad-hoc thread-context + separate plan-content push.
    try {
        const ctx = await handleContextResource(root, `loom://context/${planId}?mode=implementing`);
        messages.push({ role: 'user', content: { type: 'text', text: ctx.contents[0].text } });
    } catch { /* context is best-effort */ }

    const instruction = nextStep
        ? [
            `Implement step ${nextStep.order ?? '?'}${nextStep.id ? ` (id: ${nextStep.id})` : ''}: ${nextStep.description}`,
            '',
            `After completing this step, call loom_complete_step with planId="${planId}" and stepNumber=${nextStep.order}.`,
        ].join('\n')
        : `All steps are complete in plan ${planId}. You may close it using loom_close_plan.`;

    messages.push({ role: 'user', content: { type: 'text', text: instruction } });

    return {
        description: nextStep
            ? `Implement step ${nextStep.order} of ${planId}: ${nextStep.description}`
            : `All steps complete in ${planId}`,
        messages,
    };
}
