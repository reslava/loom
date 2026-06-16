import * as fs from 'fs-extra';
import { restoreItem, RestoreInput } from '../../../app/dist/restore';

export const toolDef = {
    name: 'loom_restore',
    description:
        "Restore an archived Loom item from loom/.archive/ back to loom/ (inverse of loom_archive). Restore a thread/weave folder by { weaveId, threadId? }, or a single archived doc by { archivedRelPath } (its path relative to loom/.archive/, e.g. 'core-engine/foo/plans/x.md'). Empty archive container dirs are pruned. Use this tool — do not move files directly.",
    inputSchema: {
        type: 'object' as const,
        properties: {
            weaveId: { type: 'string', description: 'Weave to restore (whole folder), or the weave of the thread to restore' },
            threadId: { type: 'string', description: 'Thread to restore (requires weaveId)' },
            archivedRelPath: { type: 'string', description: "A single doc's path relative to loom/.archive/ (mutually exclusive with weaveId)" },
        },
        required: [],
    },
};

export async function handle(root: string, args: Record<string, unknown>) {
    const weaveId = args['weaveId'] as string | undefined;
    const threadId = args['threadId'] as string | undefined;
    const archivedRelPath = args['archivedRelPath'] as string | undefined;

    const input: RestoreInput = weaveId
        ? { weaveId, threadId }
        : { archivedRelPath: archivedRelPath as string };

    const result = await restoreItem(input, {
        getActiveLoomRoot: () => root,
        fs,
        // (loomRoot resolution: the tool's `root` is already the active loom root)
    });
    return { content: [{ type: 'text' as const, text: JSON.stringify(result) }] };
}
