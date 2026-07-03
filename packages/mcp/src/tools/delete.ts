import * as fs from 'fs-extra';
import { resolveDocIdOrThrow } from '../../../fs/dist';
import { removeItem, RemoveInput } from '../../../app/dist/remove';

export const toolDef = {
    name: 'loom_delete',
    description:
        "Permanently delete a Loom doc by doc_ulid, or an entire thread/weave folder by { weave_slug, thread_slug? }. Destructive and irreversible — prefer loom_archive for recoverable removal. Pass exactly one of: doc_ulid, or weave_slug (+ optional thread_slug). A thread/weave is a folder operation, addressed by its folder slug (live or archived). Use this tool — do not delete files directly.",
    inputSchema: {
        type: 'object' as const,
        properties: {
            doc_ulid: { type: 'string', description: 'Document ULID to delete (mutually exclusive with weave_slug)' },
            weave_slug: { type: 'string', description: 'Weave folder slug to delete (whole folder, live or archived), or the weave of the thread to delete' },
            thread_slug: { type: 'string', description: 'Thread folder slug to delete (requires weave_slug)' },
            archived_rel_path: { type: 'string', description: 'Path (relative to loom/.archive/) of an archived reference to permanently delete' },
        },
        required: [],
    },
};

export async function handle(root: string, args: Record<string, unknown>) {
    const docUlid = args['doc_ulid'] as string | undefined;
    const weaveSlug = args['weave_slug'] as string | undefined;
    const threadSlug = args['thread_slug'] as string | undefined;
    const archivedRelPath = args['archived_rel_path'] as string | undefined;

    const input: RemoveInput = archivedRelPath
        ? { archivedRelPath }
        : docUlid
        ? { docUlid }
        : { weaveSlug: weaveSlug as string, threadSlug };

    const result = await removeItem(input, {
        getActiveLoomRoot: () => root,
        resolveDocIdOrThrow,
        fs,
    });
    return { content: [{ type: 'text' as const, text: JSON.stringify(result) }] };
}
