import * as fs from 'fs-extra';
import { getActiveLoomRoot, saveDoc, loadDoc } from '../../fs/dist';
import { resolveThreadUlid } from '../../app/dist/utils/resolveThreadFolder';
import { createThread } from '../../app/dist/thread';

/**
 * Turn a human thread argument into the `th_` ULID the app contract requires.
 *
 * The CLI is the human surface, so it accepts either form:
 *   - a `th_…` ULID → passed straight through;
 *   - a folder SLUG → resolved to its ULID, and — as the CLI convenience that a new
 *     doc may start a new thread — created explicitly (via `createThread`) if absent.
 *
 * The app layer never fabricates a thread; this explicit create lives at the delivery
 * edge so the "new idea starts a new thread" ergonomics survive without the old seam.
 */
export async function ensureThreadUlid(weaveSlug: string, threadArg: string, title?: string): Promise<string> {
    if (/^th_/i.test(threadArg)) return threadArg; // already the ULID identity
    const readDeps = { getActiveLoomRoot, loadDoc, fs };
    try {
        return await resolveThreadUlid(weaveSlug, threadArg, readDeps);
    } catch {
        const { id } = await createThread(
            { weaveSlug, threadSlug: threadArg, title },
            { getActiveLoomRoot, saveDoc, fs },
        );
        return id;
    }
}
