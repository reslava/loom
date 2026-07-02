import * as path from 'path';
import * as fsExtra from 'fs-extra';

/**
 * Move a file/dir tree with an **atomic-or-fail-loud** guarantee: after this
 * resolves, `source` is gone and only `dest` exists — or it throws and the tree
 * is left exactly as it was (no duplicate).
 *
 * Why this exists: fs-extra's `move` renames when it can, but falls back to
 * copy-then-remove when a plain rename isn't possible (cross-device, or — on
 * Windows — a file under `source` held open by an editor/handle). If the
 * post-copy removal of `source` fails, the copy has *already* landed, leaving a
 * silent duplicate (two copies of the same thread → duplicate ULIDs, doubled
 * roadmap/link-index counts). A caller that used raw `fs.move` had no way to
 * tell that half-move apart from success.
 *
 * Guarantee here: if `source` survives (whether `move` threw or resolved), we
 * roll back the copy we just made and throw an actionable error. We only remove
 * `dest` when *we* created it — a pre-existing `dest` is never touched.
 */
export async function moveTreeOrThrow(
    source: string,
    dest: string,
    fs: typeof fsExtra = fsExtra,
): Promise<void> {
    const destPreexisted = await fs.pathExists(dest);
    // Roll back only the copy we made; never clobber a dest that was already there.
    const rollback = async (): Promise<void> => {
        if (!destPreexisted) await fs.remove(dest).catch(() => { /* best-effort */ });
    };

    await fs.ensureDir(path.dirname(dest));
    try {
        await fs.move(source, dest, { overwrite: false });
    } catch (err) {
        // move may have copied `dest` before failing to remove `source`.
        await rollback();
        throw new Error(
            `Move failed for "${source}" → "${dest}": ${(err as Error).message}. ` +
            `A file there is likely open or locked — close any editors holding these ` +
            `docs and retry. No changes were kept.`,
        );
    }

    // Defensive: even a resolved `move` can leave `source` behind on some
    // copy-fallback paths. Verify, and if so roll back so we never duplicate.
    if (await fs.pathExists(source)) {
        await rollback();
        throw new Error(
            `Move incomplete: source still present at "${source}" after the move — a file ` +
            `there is likely open or locked. Close any editors holding these docs and retry. ` +
            `No changes were kept.`,
        );
    }
}
