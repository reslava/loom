import * as path from 'path';
import * as fsExtra from 'fs-extra';
import { loadDoc } from '../../fs/dist';
import {
    planOrdinalFromFile, chatOrdinalFromFile, nextOrdinal,
    planFileName, doneFileName, chatFileName, singletonFileName,
    isIdeaFile, isDesignFile,
} from '../../core/dist';

/**
 * `loom migrate-layout` — normalise a repo's on-disk filenames to the canonical
 * flat scheme (Step 1's writers already emit it for NEW docs; this brings EXISTING
 * docs into line and lets a future release drop dual-read):
 *
 *   {threadId}-idea.md      → idea.md
 *   {threadId}-design.md    → design.md
 *   {anything}-plan-NNN.md  → plan-NNN.md
 *   done docs               → plan-NNN-done.md   (ordinal from the done's own name,
 *                                                  else from its parent plan)
 *   {threadId}-chat-NNN.md  → chat-NNN.md        (bare {threadId}.md gets a fresh ordinal)
 *
 * RENAME-ONLY: no doc content is touched. Identity is the frontmatter ULID and every
 * cross-reference (parent_id/child_ids/requires_load/blockedBy/depends_on) points at
 * it, so renaming files rewrites nothing. Idempotent (a file already at its canonical
 * name is a no-op) and collision-safe (never overwrites an existing target).
 *
 * req.md / thread.md / ctx.md are already flat; references keep their {slug}.md.
 */

export interface MigrateLayoutInput {
    dryRun?: boolean;
}

export interface LayoutRename {
    /** loom-root-relative source path. */
    from: string;
    /** loom-root-relative destination path. */
    to: string;
}

export interface LayoutSkip {
    path: string;
    reason: string;
}

export interface MigrateLayoutResult {
    dryRun: boolean;
    renames: LayoutRename[];
    skipped: LayoutSkip[];
}

export interface MigrateLayoutDeps {
    getActiveLoomRoot: () => string;
    fs: typeof fsExtra;
    loadDoc: typeof loadDoc;
}

const RESERVED_THREAD_SUBDIRS = new Set(['plans', 'done', 'chats', 'refs', '.archive']);
const RESERVED_WEAVE_ENTRIES = new Set(['.archive', 'refs', 'chats', 'plans', 'done']);

async function subdirs(fs: typeof fsExtra, dir: string): Promise<string[]> {
    const entries = await fs.readdir(dir).catch(() => [] as string[]);
    const out: string[] = [];
    for (const e of entries) {
        const st = await fs.stat(path.join(dir, e)).catch(() => null);
        if (st?.isDirectory()) out.push(e);
    }
    return out;
}

async function mdFiles(fs: typeof fsExtra, dir: string): Promise<string[]> {
    if (!(await fs.pathExists(dir))) return [];
    return (await fs.readdir(dir)).filter(f => f.endsWith('.md'));
}

export async function migrateLayout(
    input: MigrateLayoutInput,
    deps: MigrateLayoutDeps,
): Promise<MigrateLayoutResult> {
    const dryRun = input.dryRun ?? false;
    const loomRoot = deps.getActiveLoomRoot();
    const loomDir = path.join(loomRoot, 'loom');
    const renames: LayoutRename[] = [];
    const skipped: LayoutSkip[] = [];

    const rel = (p: string) => path.relative(loomRoot, p).split(path.sep).join('/');

    // Queue a rename after collision/idempotency checks.
    const plan = (fromAbs: string, toAbs: string) => {
        if (fromAbs === toAbs) return;                     // already canonical — no-op
        if (deps.fs.existsSync(toAbs)) {
            skipped.push({ path: rel(fromAbs), reason: `target ${rel(toAbs)} already exists` });
            return;
        }
        renames.push({ from: rel(fromAbs), to: rel(toAbs) });
    };

    if (!(await deps.fs.pathExists(loomDir))) {
        return { dryRun, renames, skipped };
    }

    for (const weave of await subdirs(deps.fs, loomDir)) {
        if (RESERVED_WEAVE_ENTRIES.has(weave)) continue;
        const weaveDir = path.join(loomDir, weave);

        for (const thread of await subdirs(deps.fs, weaveDir)) {
            if (RESERVED_THREAD_SUBDIRS.has(thread)) continue;
            const threadDir = path.join(weaveDir, thread);

            // idea / design singletons at the thread root.
            for (const f of await mdFiles(deps.fs, threadDir)) {
                if (isIdeaFile(f) && f !== 'idea.md') {
                    plan(path.join(threadDir, f), path.join(threadDir, singletonFileName('idea')));
                } else if (isDesignFile(f) && f !== 'design.md') {
                    plan(path.join(threadDir, f), path.join(threadDir, singletonFileName('design')));
                }
            }

            // plans/ — {threadId}-plan-NNN.md → plan-NNN.md; also map planId → ordinal for done docs.
            const plansDir = path.join(threadDir, 'plans');
            const planIdToOrdinal = new Map<string, number>();
            for (const f of await mdFiles(deps.fs, plansDir)) {
                const ord = planOrdinalFromFile(f);
                if (ord === null) { skipped.push({ path: rel(path.join(plansDir, f)), reason: 'no plan ordinal in filename' }); continue; }
                try {
                    const doc = await deps.loadDoc(path.join(plansDir, f));
                    if (doc?.id) planIdToOrdinal.set(doc.id, ord);
                } catch { /* keep going; ordinal from filename still drives the rename */ }
                plan(path.join(plansDir, f), path.join(plansDir, planFileName(ord)));
            }

            // done/ — ordinal from the done's own name, else from its parent plan.
            const doneDir = path.join(threadDir, 'done');
            for (const f of await mdFiles(deps.fs, doneDir)) {
                let ord = planOrdinalFromFile(f);
                if (ord === null) {
                    try {
                        const doc = await deps.loadDoc(path.join(doneDir, f));
                        const parent = (doc as { parent_id?: string })?.parent_id;
                        if (parent && planIdToOrdinal.has(parent)) ord = planIdToOrdinal.get(parent)!;
                    } catch { /* fall through to skip */ }
                }
                if (ord === null) { skipped.push({ path: rel(path.join(doneDir, f)), reason: 'could not resolve plan ordinal for done doc' }); continue; }
                plan(path.join(doneDir, f), path.join(doneDir, doneFileName(ord)));
            }

            // chats/ — {threadId}-chat-NNN.md → chat-NNN.md; bare/ordinal-less names get a fresh ordinal.
            const chatsDir = path.join(threadDir, 'chats');
            const chatTargets: string[] = [];
            for (const f of await mdFiles(deps.fs, chatsDir)) {
                let ord = chatOrdinalFromFile(f);
                if (ord === null) ord = nextOrdinal(chatTargets, 'chat');
                const target = chatFileName(ord);
                chatTargets.push(target);
                plan(path.join(chatsDir, f), path.join(chatsDir, target));
            }
        }
    }

    if (!dryRun) {
        for (const r of renames) {
            await deps.fs.move(path.join(loomRoot, r.from), path.join(loomRoot, r.to), { overwrite: false });
        }
    }

    return { dryRun, renames, skipped };
}
