import * as path from 'path';
import * as fsExtra from 'fs-extra';
import { getActiveLoomRoot, resolveDocIdOrThrow } from '../../fs/dist';

/**
 * Use-case for permanently deleting a Loom item: a single doc (by docUlid) or a
 * whole thread/weave folder (by weaveSlug + optional threadSlug). Destructive and
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
    | { docUlid: string }
    | { weaveSlug: string; threadSlug?: string }
    | { archivedRelPath: string };

export async function removeItem(
    input: RemoveInput,
    deps: RemoveDeps,
): Promise<{ removed: string }> {
    const loomRoot = deps.getActiveLoomRoot();

    // Archived refs aren't in the live index — delete them by path under loom/.archive/
    // (mirror of loom_restore's archivedRelPath). Guarded to .archive/.
    if ('archivedRelPath' in input && input.archivedRelPath) {
        const archiveRoot = path.join(loomRoot, 'loom', '.archive');
        const target = path.resolve(archiveRoot, input.archivedRelPath);
        if (target !== archiveRoot && !target.startsWith(archiveRoot + path.sep)) {
            throw new Error(`Refused: '${input.archivedRelPath}' is outside loom/.archive/.`);
        }
        if (!(await deps.fs.pathExists(target))) {
            throw new Error(`Nothing to delete at .archive/${input.archivedRelPath}.`);
        }
        await deps.fs.remove(target);
        return { removed: target };
    }

    if ('docUlid' in input && input.docUlid) {
        const { filePath } = await deps.resolveDocIdOrThrow(loomRoot, input.docUlid);
        await deps.fs.remove(filePath);
        return { removed: filePath };
    }

    if ('weaveSlug' in input && input.weaveSlug) {
        const rel = input.threadSlug
            ? path.join(input.weaveSlug, input.threadSlug)
            : input.weaveSlug;
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

    throw new Error('removeItem requires either { docUlid } or { weaveSlug, threadSlug? }.');
}
