import * as fs from 'fs-extra';
import { getActiveLoomRoot, buildLinkIndex, loadDoc } from '../../../fs/dist';
import { validate } from '../../../app/dist/validate';

export const toolDef = {
    name: 'loom_validate',
    description:
        'Validate Loom docs and return structured per-weave issues (broken parent_id, dangling child_id, stale plans, missing Steps tables, step-blocker cycles). Pass weaveId for a single weave, or all=true for every weave. Pure read — no mutations.',
    inputSchema: {
        type: 'object' as const,
        properties: {
            weaveId: { type: 'string', description: 'Validate a single weave' },
            all: { type: 'boolean', description: 'Validate every weave (used when weaveId is omitted)' },
        },
        required: [],
    },
};

export async function handle(root: string, args: Record<string, unknown>) {
    const weaveId = args['weaveId'] as string | undefined;
    // Only the structured `results` are returned — never the LinkIndex (functions/maps).
    const { results } = await validate(
        { weaveId, all: !weaveId },
        { getActiveLoomRoot, buildLinkIndex, loadDoc, fs, loomRoot: root },
    );
    return { content: [{ type: 'text' as const, text: JSON.stringify({ results }) }] };
}
