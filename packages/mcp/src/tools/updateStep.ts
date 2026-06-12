import { loadWeave, saveDocs } from '../../../fs/dist';
import { runEvent } from '../../../app/dist/runEvent';
import { updateStep as updateStepUseCase } from '../../../app/dist/updateStep';

export const toolDef = {
    name: 'loom_update_step',
    description: 'Amend the structured fields of a single plan step (description, files, blockedBy, satisfies). Surgical only — for cosmetic/citation/typo fixes, NOT substantive plan redesign (use refine/regenerate for that). title and detail are body prose — edit those with loom_patch_doc. A done step (and a done plan) is immutable history EXCEPT for a citation-only patch: passing only `satisfies` (no description/files/blockedBy) records what completed work served, e.g. citing a requirement added later via loom_amend_req. Any other field on a done step, and any edit to a cancelled step, is rejected. Use this tool to amend steps — do not edit plan files directly.',
    inputSchema: {
        type: 'object' as const,
        properties: {
            planId: { type: 'string', description: 'Plan id (ULID e.g. "pl_01J…" or filename stem).' },
            stepId: { type: 'string', description: 'The step\'s stable id (the `id` field in the steps frontmatter, e.g. "loom-patch-doc").' },
            description: { type: 'string', description: 'New step description (the table "Step" cell). Omit to leave unchanged.' },
            files: { type: 'array', items: { type: 'string' }, description: 'Replacement "Files touched" list. Omit to leave unchanged.' },
            blockedBy: { type: 'array', items: { type: 'string' }, description: 'Replacement blockedBy list (step ids / plan ids). Omit to leave unchanged.' },
            satisfies: { type: 'array', items: { type: 'string' }, description: 'Replacement satisfies list (requirement handles). Omit to leave unchanged.' },
        },
        required: ['planId', 'stepId'],
    },
};

export async function handle(root: string, args: Record<string, unknown>) {
    const planId = args['planId'] as string;
    const stepId = args['stepId'] as string;
    const patch = {
        ...(args['description'] !== undefined ? { description: args['description'] as string } : {}),
        ...(Array.isArray(args['files']) ? { files: args['files'] as string[] } : {}),
        ...(Array.isArray(args['blockedBy']) ? { blockedBy: args['blockedBy'] as string[] } : {}),
        ...(Array.isArray(args['satisfies']) ? { satisfies: args['satisfies'] as string[] } : {}),
    };

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

    const result = await updateStepUseCase({ planId, stepId, patch }, deps);
    return { content: [{ type: 'text' as const, text: JSON.stringify(result) }] };
}
