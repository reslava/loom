import * as path from 'path';
import * as fsExtra from 'fs-extra';
import { getActiveLoomRoot, loadDoc } from '../../../fs/dist';
import { ThreadDoc } from '../../../core/dist';

export interface ResolveThreadFolderDeps {
    getActiveLoomRoot: typeof getActiveLoomRoot;
    loadDoc: typeof loadDoc;
    fs: typeof fsExtra;
}

export interface ResolvedThreadFolder {
    /** The thread's folder slug within the weave (e.g. "voicings-engine"). */
    threadSlug: string;
    /** Absolute path to the thread folder. */
    threadPath: string;
}

/**
 * Resolve a thread's stable `th_` ULID to its folder within a weave.
 *
 * Scans `loom/{weaveSlug}/*​/thread.md` for the manifest whose `id === threadUlid`
 * and returns that thread's folder slug + absolute path. This is the single
 * ULID→folder chokepoint every doc-create / promote use-case routes through, so
 * the API can be referenced by the stable ULID (what the agent holds) rather than
 * by the renameable folder slug.
 *
 * Throws if the weave is missing or no thread matches — a doc-create NEVER
 * fabricates a thread from an unresolvable reference (the core invariant of the
 * api-contract-refactor: the originating bug was a create silently minting a
 * duplicate ULID-named thread instead of erroring).
 */
export async function resolveThreadFolder(
    weaveSlug: string,
    threadUlid: string,
    deps: ResolveThreadFolderDeps,
): Promise<ResolvedThreadFolder> {
    const loomRoot = deps.getActiveLoomRoot();
    const weaveDir = path.join(loomRoot, 'loom', weaveSlug);
    if (!(await deps.fs.pathExists(weaveDir))) {
        throw new Error(`Weave '${weaveSlug}' not found.`);
    }

    const entries = await deps.fs.readdir(weaveDir).catch(() => [] as string[]);
    for (const slug of entries) {
        const manifestPath = path.join(weaveDir, slug, 'thread.md');
        if (!(await deps.fs.pathExists(manifestPath))) continue;
        try {
            const doc = (await deps.loadDoc(manifestPath)) as ThreadDoc;
            if (doc.id === threadUlid) {
                return { threadSlug: slug, threadPath: path.join(weaveDir, slug) };
            }
        } catch {
            // skip a malformed manifest — a bad thread.md must not mask a good match elsewhere
        }
    }

    throw new Error(
        `No thread with ulid '${threadUlid}' in weave '${weaveSlug}'. ` +
        `A doc-create never fabricates a thread — create the thread first ` +
        `(createThread) and pass its returned thread_ulid.`,
    );
}

/**
 * Resolve a thread's folder SLUG to its stable `th_` ULID — the inverse of
 * {@link resolveThreadFolder}. Reads `loom/{weaveSlug}/{threadSlug}/thread.md` and
 * returns its `id`. Throws if the manifest is missing. This is the human→identity
 * direction: the CLI/`loom resolve-ulid` accept a slug a person typed and turn it
 * into the ULID the API contract wants.
 */
export async function resolveThreadUlid(
    weaveSlug: string,
    threadSlug: string,
    deps: ResolveThreadFolderDeps,
): Promise<string> {
    const loomRoot = deps.getActiveLoomRoot();
    const manifestPath = path.join(loomRoot, 'loom', weaveSlug, threadSlug, 'thread.md');
    if (!(await deps.fs.pathExists(manifestPath))) {
        throw new Error(`No thread '${weaveSlug}/${threadSlug}' (no thread.md). Create it first with createThread.`);
    }
    const doc = (await deps.loadDoc(manifestPath)) as ThreadDoc;
    return doc.id;
}
