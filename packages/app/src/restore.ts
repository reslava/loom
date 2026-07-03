import * as path from 'path';
import * as fsExtra from 'fs-extra';
import { getActiveLoomRoot, moveTreeOrThrow } from '../../fs/dist';

/**
 * Use-case for restoring an archived item — the inverse of `archiveItem`. Moves
 * `loom/.archive/{rel}` back to `loom/{rel}` and prunes any archive container
 * dirs left empty by the move. Keyed by weaveSlug (+ optional threadSlug) for a
 * folder, or by an archive-relative path for a single doc (archived docs are
 * not in the live link index, so they can't be addressed by ulid).
 */

export interface RestoreDeps {
    getActiveLoomRoot: typeof getActiveLoomRoot;
    fs: typeof fsExtra;
}

export type RestoreInput =
    | { weaveSlug: string; threadSlug?: string }
    | { archivedRelPath: string };

export async function restoreItem(
    input: RestoreInput,
    deps: RestoreDeps,
): Promise<{ source: string; restored: string }> {
    const loomRoot = deps.getActiveLoomRoot();
    const loomDir = path.join(loomRoot, 'loom');
    const archiveDir = path.join(loomDir, '.archive');

    let rel: string;
    if ('weaveSlug' in input && input.weaveSlug) {
        rel = input.threadSlug ? path.join(input.weaveSlug, input.threadSlug) : input.weaveSlug;
    } else if ('archivedRelPath' in input && input.archivedRelPath) {
        rel = input.archivedRelPath;
    } else {
        throw new Error('restoreItem requires either { weaveSlug, threadSlug? } or { archivedRelPath }.');
    }

    const source = path.join(archiveDir, rel);
    const restored = path.join(loomDir, rel);
    if (!(await deps.fs.pathExists(source))) {
        throw new Error(`Nothing to restore at .archive/${rel}.`);
    }
    await moveTreeOrThrow(source, restored, deps.fs);

    // Prune archive container dirs left empty by the move (e.g. the weave dir
    // after its last archived thread/doc is restored), stopping at .archive/.
    let dir = path.dirname(source);
    while (dir.startsWith(archiveDir + path.sep)) {
        const remaining = await deps.fs.readdir(dir).catch(() => ['keep'] as string[]);
        if (remaining.length > 0) break;
        await deps.fs.remove(dir);
        dir = path.dirname(dir);
    }

    return { source, restored };
}
