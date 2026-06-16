import * as fs from 'fs-extra';
import { resolveDocIdOrThrow } from '../../../fs/dist';
import { archiveItem, ArchiveInput } from '../../../app/dist/archive';

export const toolDef = {
    name: 'loom_archive',
    description:
        'Archive a Loom doc (by id) or an entire thread/weave folder (by { weaveId, threadId? }) by moving it under the single top-level loom/.archive/ tree, mirroring its weave/thread path (e.g. loom/core-engine/foo/plans/x.md → loom/.archive/core-engine/foo/plans/x.md). Recoverable via loom_restore. Pass exactly one of: id, or weaveId (+ optional threadId). Use this tool — do not move files directly.',
    inputSchema: {
        type: 'object' as const,
        properties: {
            id: { type: 'string', description: 'Document id to archive (mutually exclusive with weaveId)' },
            weaveId: { type: 'string', description: 'Weave to archive (whole folder), or the weave of the thread to archive' },
            threadId: { type: 'string', description: 'Thread to archive (requires weaveId)' },
        },
        required: [],
    },
};

export async function handle(root: string, args: Record<string, unknown>) {
    const id = args['id'] as string | undefined;
    const weaveId = args['weaveId'] as string | undefined;
    const threadId = args['threadId'] as string | undefined;

    const input: ArchiveInput = id
        ? { id }
        : { weaveId: weaveId as string, threadId };

    const result = await archiveItem(input, {
        getActiveLoomRoot: () => root,
        resolveDocIdOrThrow,
        fs,
    });
    return { content: [{ type: 'text' as const, text: JSON.stringify(result) }] };
}
