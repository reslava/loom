import * as path from 'path';
import * as fsExtra from 'fs-extra';
import { getActiveLoomRoot, resolveDocIdOrThrow, moveTreeOrThrow } from '../../fs/dist';

/**
 * Use-case for archiving a Loom item: a single doc (by docUlid) or a whole
 * thread/weave folder (by weaveSlug + optional threadSlug). The item is *moved*
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

// A thread is the atomic archive unit — thread docs archive with their whole thread
// folder, never individually (sub-thread archiving mirrored partial paths and left
// empty folders behind). The ONE exception is loom/refs/ — references and refs/chats
// have no thread, so they ARE their own atomic unit and archive individually by id.
export type ArchiveInput =
    | { weaveSlug: string; threadSlug?: string }
    | { docUlid: string };

export async function archiveItem(
    input: ArchiveInput,
    deps: ArchiveDeps,
): Promise<{ source: string; archivedPath: string }> {
    const loomRoot = deps.getActiveLoomRoot();
    const loomDir = path.join(loomRoot, 'loom');
    const prefix = loomDir + path.sep;

    let source: string;
    if ('docUlid' in input && input.docUlid) {
        const { filePath } = await deps.resolveDocIdOrThrow(loomRoot, input.docUlid);
        const refsPrefix = path.join(loomDir, 'refs') + path.sep;
        if (!filePath.startsWith(refsPrefix)) {
            throw new Error('Only references (loom/refs) archive individually — everything else archives with its whole thread: pass { weaveSlug, threadSlug? }.');
        }
        source = filePath;
    } else if ('weaveSlug' in input && input.weaveSlug) {
        source = input.threadSlug
            ? path.join(loomDir, input.weaveSlug, input.threadSlug)
            : path.join(loomDir, input.weaveSlug);
    } else {
        throw new Error('archiveItem requires { weaveSlug, threadSlug? } or a reference { docUlid }.');
    }

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
    await moveTreeOrThrow(source, archivedPath, deps.fs);
    return { source, archivedPath };
}
