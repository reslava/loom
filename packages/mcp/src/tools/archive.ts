import * as fs from 'fs-extra';
import { resolveDocIdOrThrow } from '../../../fs/dist';
import { archiveItem, ArchiveInput } from '../../../app/dist/archive';

export const toolDef = {
    name: 'loom_archive',
    description:
        'Archive a whole thread (or weave) by moving its folder under loom/.archive/, mirroring its path (e.g. loom/core-engine/foo → loom/.archive/core-engine/foo). A thread is the atomic archive unit — thread docs are NOT archivable individually (archive the whole thread). The ONE exception: a reference in loom/refs (or a refs chat) has no thread, so it archives individually by { doc_ulid } → loom/.archive/refs/…. A thread/weave is a folder operation, addressed by its folder slug. Recoverable via loom_restore. Use this tool — do not move files directly.',
    inputSchema: {
        type: 'object' as const,
        properties: {
            doc_ulid: { type: 'string', description: 'Reference doc ULID (loom/refs only) to archive individually' },
            weave_slug: { type: 'string', description: 'Weave folder slug to archive (whole folder), or the weave of the thread to archive' },
            thread_slug: { type: 'string', description: 'Thread folder slug to archive (requires weave_slug)' },
        },
        required: [],
    },
};

export async function handle(root: string, args: Record<string, unknown>) {
    const docUlid = args['doc_ulid'] as string | undefined;
    const weaveSlug = args['weave_slug'] as string | undefined;
    const threadSlug = args['thread_slug'] as string | undefined;

    const input: ArchiveInput = docUlid ? { docUlid } : { weaveSlug: weaveSlug as string, threadSlug };

    const result = await archiveItem(input, {
        getActiveLoomRoot: () => root,
        resolveDocIdOrThrow,
        fs,
    });
    return { content: [{ type: 'text' as const, text: JSON.stringify(result) }] };
}
