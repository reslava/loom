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
        const target = input.threadId
            ? path.join(loomRoot, 'loom', input.weaveId, input.threadId)
            : path.join(loomRoot, 'loom', input.weaveId);
        if (!(await deps.fs.pathExists(target))) {
            throw new Error(`Nothing to delete at ${path.relative(loomRoot, target)}.`);
        }
        await deps.fs.remove(target);
        return { removed: target };
    }

    throw new Error('removeItem requires either { id } or { weaveId, threadId? }.');
}
