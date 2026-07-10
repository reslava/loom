import * as path from 'path';
import * as fsExtra from 'fs-extra';
import { getActiveLoomRoot, saveDoc, loadDoc } from '../../fs/dist';
import { createThread } from './thread';

/**
 * `backfill-thread-manifests` migration — create a `thread.md` for every thread
 * that lacks one. Idempotent (skips threads that already have a manifest) and
 * `--dry-run` capable, so it is safe to re-run and to ship in every release: any
 * upgrading `loom install` (here or downstream) backfills the manifests the
 * roadmap needs. The `loom migrate` CLI command runs this.
 */

// Weave-root subdirectories that are not threads.
const RESERVED_SUBDIRS = new Set(['plans', 'done', 'ai-chats', 'ctx', 'refs', '.archive', 'chats']);

export interface BackfillDeps {
    getActiveLoomRoot: typeof getActiveLoomRoot;
    saveDoc: typeof saveDoc;
    loadDoc: typeof loadDoc;
    fs: typeof fsExtra;
}

export interface BackfillResult {
    created: Array<{ weaveSlug: string; threadSlug: string; id?: string }>;
    skipped: Array<{ weaveSlug: string; threadSlug: string }>;
    dryRun: boolean;
}

export async function backfillThreadManifests(
    opts: { dryRun?: boolean },
    deps: BackfillDeps,
): Promise<BackfillResult> {
    const loomRoot = deps.getActiveLoomRoot();
    const weavesDir = path.join(loomRoot, 'loom');
    const created: BackfillResult['created'] = [];
    const skipped: BackfillResult['skipped'] = [];
    const dryRun = !!opts.dryRun;

    if (!(await deps.fs.pathExists(weavesDir))) return { created, skipped, dryRun };

    const weaves = await deps.fs.readdir(weavesDir).catch(() => [] as string[]);
    for (const weaveSlug of weaves) {
        if (weaveSlug === '.archive' || weaveSlug === 'chats') continue;
        const weavePath = path.join(weavesDir, weaveSlug);
        const wstat = await deps.fs.stat(weavePath).catch(() => null);
        if (!wstat?.isDirectory()) continue;

        const threads = await deps.fs.readdir(weavePath).catch(() => [] as string[]);
        for (const threadSlug of threads) {
            if (RESERVED_SUBDIRS.has(threadSlug)) continue;
            const threadPath = path.join(weavePath, threadSlug);
            const tstat = await deps.fs.stat(threadPath).catch(() => null);
            if (!tstat?.isDirectory()) continue;

            if (await deps.fs.pathExists(path.join(threadPath, 'thread.md'))) {
                skipped.push({ weaveSlug, threadSlug });
                continue;
            }

            // Title from the thread idea when present, else the folder slug.
            let title = threadSlug;
            const ideaPath = path.join(threadPath, `${threadSlug}-idea.md`);
            if (await deps.fs.pathExists(ideaPath)) {
                try {
                    const idea = (await deps.loadDoc(ideaPath)) as { title?: string };
                    if (idea.title) title = idea.title;
                } catch { /* keep slug */ }
            }

            if (dryRun) {
                created.push({ weaveSlug, threadSlug });
                continue;
            }
            const res = await createThread(
                { weaveSlug: weaveSlug, threadSlug: threadSlug, title },
                { getActiveLoomRoot: deps.getActiveLoomRoot, saveDoc: deps.saveDoc, fs: deps.fs },
            );
            created.push({ weaveSlug, threadSlug, id: res.id });
        }
    }

    return { created, skipped, dryRun };
}
