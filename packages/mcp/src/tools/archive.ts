import * as fs from 'fs-extra';
import { resolveDocIdOrThrow } from '../../../fs/dist';
import { archiveItem, ArchiveInput } from '../../../app/dist/archive';

export const toolDef = {
    name: 'loom_archive',
    description:
        'Archive a whole thread (or weave) by moving its folder under loom/.archive/, mirroring its path (e.g. loom/core-engine/foo → loom/.archive/core-engine/foo). A thread is the atomic archive unit — individual docs are NOT archivable on their own (that left partial mirrored paths and broke restore). Recoverable via loom_restore. Pass { weaveId, threadId? }. Use this tool — do not move files directly.',
    inputSchema: {
        type: 'object' as const,
        properties: {
            weaveId: { type: 'string', description: 'Weave to archive (whole folder), or the weave of the thread to archive' },
            threadId: { type: 'string', description: 'Thread to archive (requires weaveId)' },
        },
        required: ['weaveId'],
    },
};

export async function handle(root: string, args: Record<string, unknown>) {
    const weaveId = args['weaveId'] as string | undefined;
    const threadId = args['threadId'] as string | undefined;

    const input: ArchiveInput = { weaveId: weaveId as string, threadId };

    const result = await archiveItem(input, {
        getActiveLoomRoot: () => root,
        resolveDocIdOrThrow,
        fs,
    });
    return { content: [{ type: 'text' as const, text: JSON.stringify(result) }] };
}
