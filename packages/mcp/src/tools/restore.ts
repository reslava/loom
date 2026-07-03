import * as fs from 'fs-extra';
import { restoreItem, RestoreInput } from '../../../app/dist/restore';

export const toolDef = {
    name: 'loom_restore',
    description:
        "Restore an archived Loom item from loom/.archive/ back to loom/ (inverse of loom_archive). Restore a thread/weave folder by { weave_slug, thread_slug? }, or a single archived doc by { archived_rel_path } (its path relative to loom/.archive/, e.g. 'core-engine/foo/plans/x.md'). A thread/weave is a folder operation, addressed by its folder slug. Empty archive container dirs are pruned. Use this tool — do not move files directly.",
    inputSchema: {
        type: 'object' as const,
        properties: {
            weave_slug: { type: 'string', description: 'Weave folder slug to restore (whole folder), or the weave of the thread to restore' },
            thread_slug: { type: 'string', description: 'Thread folder slug to restore (requires weave_slug)' },
            archived_rel_path: { type: 'string', description: "A single doc's path relative to loom/.archive/ (mutually exclusive with weave_slug)" },
        },
        required: [],
    },
};

export async function handle(root: string, args: Record<string, unknown>) {
    const weaveSlug = args['weave_slug'] as string | undefined;
    const threadSlug = args['thread_slug'] as string | undefined;
    const archivedRelPath = args['archived_rel_path'] as string | undefined;

    const input: RestoreInput = weaveSlug
        ? { weaveSlug, threadSlug }
        : { archivedRelPath: archivedRelPath as string };

    const result = await restoreItem(input, {
        getActiveLoomRoot: () => root,
        fs,
        // (loomRoot resolution: the tool's `root` is already the active loom root)
    });
    return { content: [{ type: 'text' as const, text: JSON.stringify(result) }] };
}
