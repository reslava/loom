import * as path from 'path';
import { findDocumentById, resolveDocIdOrThrow, loadDoc } from '../../../fs/dist';
import { PlanDoc } from '../../../core/dist/entities/plan';
import { Document } from '../../../core/dist';
import { handleContextResource } from '../resources/context';

const INSTRUCTIONS = `Implement this step using your file-editing tools (Read, Edit, Write, Bash, etc.).
After implementation:
1. Call loom_append_done with { planId, stepNumber, notes } where "notes" summarizes what you actually did (files created/edited, decisions made).
2. Call loom_complete_step with { planId, stepNumber } to mark the step ✅.
If you reach a decision that needs human input, stop and ask — do not guess.`;

export const toolDef = {
    name: 'loom_do_step',
    description: 'Get a brief for a step of a plan: thread context, step description, instructions. Pure read — no state changes, no AI inference. If stepNumber is omitted, returns the brief for the first not-done step. If provided, returns the brief for that exact step (errors if already done). The host agent (Claude Code, Cursor, etc.) is expected to act on the brief using its own tools, then call loom_append_done and loom_complete_step.',
    inputSchema: {
        type: 'object' as const,
        properties: {
            planId: { type: 'string', description: 'Plan id. Canonical form is the ULID (e.g. "pl_01J…"); the filename stem (e.g. "my-weave-plan-001") is also accepted and resolved.' },
            stepNumber: { type: 'number', description: 'Optional. Specific step number to brief. If omitted, the first not-done step is used.' },
            context_ids: { type: 'array', items: { type: 'string' }, description: 'Optional. Additional doc IDs to inject into the brief context.' },
        },
        required: ['planId'],
    },
};

export async function handle(root: string, args: Record<string, unknown>) {
    const planId = args['planId'] as string;
    const stepNumber = typeof args['stepNumber'] === 'number' ? (args['stepNumber'] as number) : undefined;
    const contextIds = Array.isArray(args['context_ids']) ? (args['context_ids'] as string[]) : [];

    // Primary (agent-supplied) id → suggest-on-miss. The contextIds lookups below
    // stay on findDocumentById (best-effort enrichment, not the agent's target id).
    const { filePath: planFilePath } = await resolveDocIdOrThrow(root, planId);

    const planDoc = await loadDoc(planFilePath) as PlanDoc;
    if (planDoc.type !== 'plan') throw new Error(`Document ${planId} is not a plan`);
    if (planDoc.status !== 'implementing') {
        throw new Error(`Plan must be "implementing" to use DoStep. Current status: ${planDoc.status}`);
    }

    const allSteps = planDoc.steps ?? [];
    let nextStep;
    if (stepNumber !== undefined) {
        const target = allSteps.find(s => s.order === stepNumber);
        if (!target) throw new Error(`Step ${stepNumber} not found in plan ${planId}.`);
        if (target.status === 'done') throw new Error(`Step ${stepNumber} of plan ${planId} is already done.`);
        nextStep = target;
    } else {
        const pendingSteps = allSteps.filter(s => s.status !== 'done' && s.status !== 'cancelled');
        if (pendingSteps.length === 0) throw new Error('All steps are already done.');
        nextStep = pendingSteps[0];
    }

    // Derive weaveId/threadId from path: loom/{weaveId}/{threadId}/plans/{planId}.md
    const plansDir = path.dirname(planFilePath);
    const threadDir = path.dirname(plansDir);
    const weaveDir = path.dirname(threadDir);
    const threadId = path.basename(threadDir);
    const weaveId = path.basename(weaveDir);

    let threadContext = '';
    try {
        const ctx = await handleContextResource(
            root,
            `loom://context/${planId}?mode=implementing`
        );
        threadContext = ctx.contents[0].text;
    } catch { /* proceed without ctx if unavailable */ }

    if (contextIds.length > 0) {
        const extraParts = await Promise.all(
            contextIds.map(async (id) => {
                try {
                    const fp = await findDocumentById(root, id);
                    if (!fp) return null;
                    const doc = await loadDoc(fp) as Document;
                    return `### ${doc.title} (${doc.type})\n\n${(doc as any).content ?? ''}`;
                } catch { return null; }
            })
        );
        const extra = extraParts.filter(Boolean).join('\n\n---\n\n');
        if (extra) threadContext += `\n\n## Additional Context\n\n${extra}`;
    }

    const planSummary = (planDoc.steps ?? [])
        .map(s => `${s.status === 'done' ? '✅' : '⬜'} Step ${s.order}: ${s.description}`)
        .join('\n');

    const brief = {
        planId,
        planTitle: planDoc.title,
        weaveId,
        threadId,
        stepNumber: nextStep.order,
        stepDescription: nextStep.description,
        filesToTouch: nextStep.files_touched,
        threadContext,
        planSummary,
        instructions: INSTRUCTIONS,
    };

    return {
        content: [{
            type: 'text' as const,
            text: JSON.stringify(brief, null, 2),
        }],
    };
}
