import * as path from 'path';
import * as fsExtra from 'fs-extra';
import { getActiveLoomRoot, resolveDocIdOrThrow } from '../../fs/dist';

/**
 * Use-case for permanently deleting a Loom item: a single doc (by id) or a whole
 * thread/weave folder (by weaveId + optional threadId). Destructive and
 * irreversible — `archive` is the recoverable path. Lives in `app` so deletion,
 * like every other `loom/` mutation, has a single sanctioned seam rather than
 * raw `fs` calls scattered across delivery layers.
 */

export interface RemoveDeps {
    getActiveLoomRoot: typeof getActiveLoomRoot;
    resolveDocIdOrThrow: typeof resolveDocIdOrThrow;
    fs: typeof fsExtra;
}

export type RemoveInput =
    | { id: string }
    | { weaveId: string; threadId?: string };

export async function removeItem(
    input: RemoveInput,
    deps: RemoveDeps,
): Promise<{ removed: string }> {
    const loomRoot = deps.getActiveLoomRoot();

    if ('id' in input && input.id) {
        const { filePath } = await deps.resolveDocIdOrThrow(loomRoot, input.id);
        await deps.fs.remove(filePath);
        return { removed: filePath };
    }

    if ('weaveId' in input && input.weaveId) {
        const rel = input.threadId
            ? path.join(input.weaveId, input.threadId)
            : input.weaveId;
        const live = path.join(loomRoot, 'loom', rel);
        const archived = path.join(loomRoot, 'loom', '.archive', rel);
        // Delete wherever the folder actually lives — an archived item is under
        // loom/.archive/ mirroring its path, not the live tree.
        const target = (await deps.fs.pathExists(live)) ? live
            : (await deps.fs.pathExists(archived)) ? archived
            : null;
        if (!target) {
            throw new Error(`Nothing to delete at ${rel} (checked live and .archive).`);
        }
        await deps.fs.remove(target);
        return { removed: target };
    }

    throw new Error('removeItem requires either { id } or { weaveId, threadId? }.');
}
