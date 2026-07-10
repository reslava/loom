import { loadWeave, saveDocs } from '../../../fs/dist';
import { runEvent } from '../../../app/dist/runEvent';
import { addStep as addStepUseCase } from '../../../app/dist/addStep';
import { StepPosition } from '../../../core/dist/events/planEvents';
import { requirePlanUlid } from './planUlid';

export const toolDef = {
    name: 'loom_add_step',
    description: 'Insert a new step into a plan at a position (append by default, or before/after an existing step id). The step gets a fresh stable slug id and the order is recomputed. title/detail seed the step\'s `### Step N` body detail section. A new (pending) step cannot be inserted before the leading done/cancelled block (immutable history). Allowed on draft/active/implementing/blocked plans. Use this tool to add steps — do not edit plan files directly.',
    inputSchema: {
        type: 'object' as const,
        properties: {
            plan_ulid: { type: 'string', description: 'Plan\'s stable pl_ ULID (e.g. "pl_01J…"). ULID only — a filename stem or title is rejected.' },
            description: { type: 'string', description: 'The new step (the table "Step" cell). Required.' },
            title: { type: 'string', description: 'Optional short heading for the step\'s `### Step N — {title}` detail section. Defaults to the description.' },
            files: { type: 'array', items: { type: 'string' }, description: 'Files this step touches ("Files touched" column).' },
            blockedBy: { type: 'array', items: { type: 'string' }, description: 'Steps this new step depends on. Each entry is an existing step-id slug, a 1-based ordinal ("1","2") naming a step by its position in the final order, or a cross-plan "pl_…" plan id. Do NOT invent "s1"-style ids — an unknown value is rejected, not silently stored.' },
            satisfies: { type: 'array', items: { type: 'string' }, description: 'Requirement handles (IN/C) this step advances.' },
            detail: { type: 'string', description: 'Optional markdown body for the step\'s `### Step N` detail section.' },
            after: { type: 'string', description: 'Insert immediately after this existing step id. Mutually exclusive with `before`.' },
            before: { type: 'string', description: 'Insert immediately before this existing step id. Mutually exclusive with `after`.' },
        },
        required: ['plan_ulid', 'description'],
    },
};

export async function handle(root: string, args: Record<string, unknown>) {
    const planUlid = requirePlanUlid(args);
    const after = args['after'] as string | undefined;
    const before = args['before'] as string | undefined;
    if (after !== undefined && before !== undefined) {
        throw new Error('Provide only one of `after` / `before` (or neither, to append).');
    }
    const position: StepPosition | undefined =
        after !== undefined ? { after } : before !== undefined ? { before } : undefined;

    const step = {
        description: args['description'] as string,
        ...(args['title'] !== undefined ? { title: args['title'] as string } : {}),
        ...(Array.isArray(args['files']) ? { files: args['files'] as string[] } : {}),
        ...(Array.isArray(args['blockedBy']) ? { blockedBy: args['blockedBy'] as string[] } : {}),
        ...(Array.isArray(args['satisfies']) ? { satisfies: args['satisfies'] as string[] } : {}),
        ...(args['detail'] !== undefined ? { detail: args['detail'] as string } : {}),
    };

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

    const result = await addStepUseCase({ planUlid, step, position }, deps);
    return { content: [{ type: 'text' as const, text: JSON.stringify(result) }] };
}
