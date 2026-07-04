import * as fs from 'fs-extra';
import { getActiveLoomRoot } from '../../../fs/dist';
import { renameWeave } from '../../../app/dist/weave';

export const toolDef = {
    name: 'loom_rename_weave',
    description: "Rename a weave folder (loom/{weave_slug}). A weave is a pure fs container with no title — this renames the directory only; every cross-reference is by ULID, so nothing else changes. Refuses reserved names, a missing source, or an existing target. Use this tool — do not rename weave folders directly.",
    inputSchema: {
        type: 'object' as const,
        properties: {
            weave_slug: { type: 'string', description: 'Current weave folder slug.' },
            new_weave_slug: { type: 'string', description: 'New weave folder slug.' },
        },
        required: ['weave_slug', 'new_weave_slug'],
    },
};

export async function handle(root: string, args: Record<string, unknown>) {
    const result = await renameWeave(
        { weaveSlug: args['weave_slug'] as string, newWeaveSlug: args['new_weave_slug'] as string },
        { getActiveLoomRoot: () => getActiveLoomRoot(root), fs },
    );
    return { content: [{ type: 'text' as const, text: JSON.stringify(result) }] };
}
