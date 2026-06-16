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
    weaveId: string;
}

export async function createWeave(
    input: CreateWeaveInput,
    deps: CreateWeaveDeps,
): Promise<{ weaveId: string; filePath: string }> {
    const loomRoot = deps.getActiveLoomRoot();
    const weavePath = path.join(loomRoot, 'loom', input.weaveId);
    if (await deps.fs.pathExists(weavePath)) {
        throw new Error(`A weave already exists at loom/${input.weaveId}.`);
    }
    await deps.fs.ensureDir(weavePath);
    return { weaveId: input.weaveId, filePath: weavePath };
}
