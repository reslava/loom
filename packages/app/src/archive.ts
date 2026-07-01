import * as path from 'path';
import * as fsExtra from 'fs-extra';
import { getActiveLoomRoot, resolveDocIdOrThrow } from '../../fs/dist';

/**
 * Use-case for archiving a Loom item: a single doc (by id) or a whole
 * thread/weave folder (by weaveId + optional threadId). The item is *moved*
 * under the single top-level `loom/.archive/` tree, mirroring its weave/thread
 * path (never an in-thread `.archive/`). Recoverable via `restoreItem`.
 *
 * Previously this logic lived directly in the MCP archive tool (raw `fs.move`);
 * it now lives here so archive shares the "all loom/ mutation goes through app"
 * seam with create/delete/restore.
 */

export interface ArchiveDeps {
    getActiveLoomRoot: typeof getActiveLoomRoot;
    resolveDocIdOrThrow: typeof resolveDocIdOrThrow;
    fs: typeof fsExtra;
}

// A thread is the atomic archive unit — you archive a whole thread (or weave) folder,
// never an individual doc. (Sub-thread archiving mirrored partial paths and left empty
// folders behind, breaking restore; a whole-folder move is clean and reversible.)
export type ArchiveInput = { weaveId: string; threadId?: string };

export async function archiveItem(
    input: ArchiveInput,
    deps: ArchiveDeps,
): Promise<{ source: string; archivedPath: string }> {
    const loomRoot = deps.getActiveLoomRoot();
    const loomDir = path.join(loomRoot, 'loom');
    const prefix = loomDir + path.sep;

    if ((input as { id?: string }).id) {
        throw new Error('Only whole threads or weaves can be archived, not individual docs — pass { weaveId, threadId? }.');
    }
    if (!input.weaveId) {
        throw new Error('archiveItem requires { weaveId, threadId? }.');
    }
    const source = input.threadId
        ? path.join(loomDir, input.weaveId, input.threadId)
        : path.join(loomDir, input.weaveId);

    if (!source.startsWith(prefix)) {
        throw new Error(`Cannot archive: ${source} is not inside loom/.`);
    }
    if (!(await deps.fs.pathExists(source))) {
        // If the .archive mirror exists, the item is already archived — say so clearly.
        const rel = source.slice(prefix.length);
        if (await deps.fs.pathExists(path.join(loomDir, '.archive', rel))) {
            throw new Error(`'${rel}' is already archived.`);
        }
        throw new Error(`Nothing to archive at ${path.relative(loomRoot, source)}.`);
    }

    // Mirror the path under the single top-level loom/.archive/ tree.
    const rel = source.slice(prefix.length);
    const archivedPath = path.join(loomDir, '.archive', rel);
    await deps.fs.ensureDir(path.dirname(archivedPath));
    await deps.fs.move(source, archivedPath, { overwrite: false });
    return { source, archivedPath };
}
