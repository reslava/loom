import * as fs from 'fs-extra';
import { getActiveLoomRoot } from '../../../fs/dist';
import { renameWeave } from '../../../app/dist/weave';

export const toolDef = {
    name: 'loom_rename_weave',
    description: "Rename a weave folder (loom/{weaveId}). A weave is a pure fs container with no title — this renames the directory only; every cross-reference is by ULID, so nothing else changes. Refuses reserved names, a missing source, or an existing target. Use this tool — do not rename weave folders directly.",
    inputSchema: {
        type: 'object' as const,
        properties: {
            weaveId: { type: 'string', description: 'Current weave id (folder name).' },
            newWeaveId: { type: 'string', description: 'New weave id (folder name).' },
        },
        required: ['weaveId', 'newWeaveId'],
    },
};

export async function handle(root: string, args: Record<string, unknown>) {
    const result = await renameWeave(
        { weaveId: args['weaveId'] as string, newWeaveId: args['newWeaveId'] as string },
        { getActiveLoomRoot: () => getActiveLoomRoot(root), fs },
    );
    return { content: [{ type: 'text' as const, text: JSON.stringify(result) }] };
}
