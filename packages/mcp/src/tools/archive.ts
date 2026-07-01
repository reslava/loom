import * as fs from 'fs-extra';
import { resolveDocIdOrThrow } from '../../../fs/dist';
import { archiveItem, ArchiveInput } from '../../../app/dist/archive';

export const toolDef = {
    name: 'loom_archive',
    description:
        'Archive a whole thread (or weave) by moving its folder under loom/.archive/, mirroring its path (e.g. loom/core-engine/foo → loom/.archive/core-engine/foo). A thread is the atomic archive unit — thread docs are NOT archivable individually (archive the whole thread). The ONE exception: a reference in loom/refs (or a refs chat) has no thread, so it archives individually by { id } → loom/.archive/refs/…. Recoverable via loom_restore. Use this tool — do not move files directly.',
    inputSchema: {
        type: 'object' as const,
        properties: {
            id: { type: 'string', description: 'Reference doc id (loom/refs only) to archive individually' },
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

    const input: ArchiveInput = id ? { id } : { weaveId: weaveId as string, threadId };

    const result = await archiveItem(input, {
        getActiveLoomRoot: () => root,
        resolveDocIdOrThrow,
        fs,
    });
    return { content: [{ type: 'text' as const, text: JSON.stringify(result) }] };
}
