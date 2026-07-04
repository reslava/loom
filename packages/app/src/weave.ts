import * as path from 'path';
import * as fsExtra from 'fs-extra';
import { getActiveLoomRoot } from '../../fs/dist';

/**
 * Use-case for creating an empty weave folder. A weave has no manifest doc
 * (unlike a thread's `thread.md`), so the whole job is materialising the
 * `loom/{weaveId}` directory — but it still lives behind an app use-case so the
 * invariant "every `loom/` mutation goes through `app` (never raw `fs` from a
 * delivery layer)" holds for weave creation too.
 */

export interface CreateWeaveDeps {
    getActiveLoomRoot: typeof getActiveLoomRoot;
    fs: typeof fsExtra;
}

export interface CreateWeaveInput {
    weaveSlug: string;
}

export async function createWeave(
    input: CreateWeaveInput,
    deps: CreateWeaveDeps,
): Promise<{ weaveId: string; filePath: string }> {
    const loomRoot = deps.getActiveLoomRoot();
    const weavePath = path.join(loomRoot, 'loom', input.weaveSlug);
    if (await deps.fs.pathExists(weavePath)) {
        throw new Error(`A weave already exists at loom/${input.weaveSlug}.`);
    }
    await deps.fs.ensureDir(weavePath);
    return { weaveId: input.weaveSlug, filePath: weavePath };
}

/** loom/ entries that are not weaves and must never be a rename source/target. */
const RESERVED_WEAVE_IDS = new Set(['.archive', 'refs', 'chats']);

function assertValidWeaveId(id: string, label: string): void {
    if (!id || id.includes('/') || id.includes('\\') || id.includes('..')) {
        throw new Error(`Invalid ${label} weave id '${id}'.`);
    }
    if (RESERVED_WEAVE_IDS.has(id)) {
        throw new Error(`'${id}' is a reserved loom/ folder, not a weave.`);
    }
}

export interface RenameWeaveInput {
    weaveSlug: string;
    newWeaveSlug: string;
}

/**
 * Rename a weave = rename its `loom/{weaveId}` folder. A weave is a pure fs container
 * (no manifest, no title), and every cross-reference is by ULID — so the folder move
 * rewrites zero doc content. Thread `depends_on` edges (thread ULIDs) survive intact.
 */
export async function renameWeave(
    input: RenameWeaveInput,
    deps: CreateWeaveDeps,
): Promise<{ from: string; to: string }> {
    assertValidWeaveId(input.weaveSlug, 'source');
    assertValidWeaveId(input.newWeaveSlug, 'target');
    if (input.weaveSlug === input.newWeaveSlug) {
        return { from: input.weaveSlug, to: input.newWeaveSlug };
    }
    const loomRoot = deps.getActiveLoomRoot();
    const from = path.join(loomRoot, 'loom', input.weaveSlug);
    const to = path.join(loomRoot, 'loom', input.newWeaveSlug);
    if (!(await deps.fs.pathExists(from))) throw new Error(`Weave '${input.weaveSlug}' not found.`);
    if (await deps.fs.pathExists(to)) throw new Error(`A weave '${input.newWeaveSlug}' already exists.`);
    await deps.fs.move(from, to, { overwrite: false });
    return { from: input.weaveSlug, to: input.newWeaveSlug };
}
