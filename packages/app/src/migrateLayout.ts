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
 *   {threadSlug}-idea.md      → idea.md
 *   {threadSlug}-design.md    → design.md
 *   {anything}-plan-NNN.md  → plan-NNN.md
 *   done docs               → plan-NNN-done.md   (ordinal from the done's own name,
 *                                                  else from its parent plan)
 *   {threadSlug}-chat-NNN.md  → chat-NNN.md        (bare {threadSlug}.md gets a fresh ordinal)
 *
 * RENAME-ONLY: no doc content is touched. Identity is the frontmatter ULID and every
 * cross-reference (parent_id/child_ids/requires_load/blockedBy/depends_on) points at
 * it, so renaming files rewrites nothing. Idempotent (a file already at its canonical
 * name is a no-op).
 *
 * COLLISION-AWARE RENUMBER: the legacy scheme let several plans in one thread share an
 * ordinal (each was `{slug}-plan-001`), so a naive strip-to-ordinal would map them all
 * onto `plan-001.md` and lose files. Instead each thread's plans (and done docs) are
 * assigned a UNIQUE thread-local ordinal: distinct ordinals (and gaps) are preserved,
 * and only the colliding extras are renumbered to the smallest free ordinal. Done docs
 * mirror their parent plan's (possibly renumbered) ordinal when it resolves. Every such
 * auto-renumber is surfaced in `collisions` for the audit log.
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

/** A group of ≥2 docs in one dir that originally wanted the same canonical ordinal,
 *  auto-renumbered so each lands on a unique target. Surfaced for the audit log. */
export interface LayoutCollision {
    /** loom-root-relative directory, e.g. loom/core-engine/core-engine/plans. */
    dir: string;
    kind: 'plan' | 'done';
    /** the ordinal ≥2 docs originally resolved to. */
    contested: number;
    members: {
        from: string;
        to: string;
        /** true for the one member that kept `contested`; false for the renumbered ones. */
        keptDesired: boolean;
    }[];
}

export interface MigrateLayoutResult {
    dryRun: boolean;
    renames: LayoutRename[];
    skipped: LayoutSkip[];
    collisions: LayoutCollision[];
}

export interface MigrateLayoutDeps {
    getActiveLoomRoot: () => string;
    fs: typeof fsExtra;
    loadDoc: typeof loadDoc;
}

const RESERVED_THREAD_SUBDIRS = new Set(['plans', 'done', 'chats', 'refs', '.archive']);
const RESERVED_WEAVE_ENTRIES = new Set(['.archive', 'refs', 'chats', 'plans', 'done']);

/** One ordinal-named doc awaiting a unique target ordinal. */
interface OrdItem {
    /** filename within its dir (unique key). */
    file: string;
    /** the ordinal it resolves to under the naive scheme. */
    desired: number;
    /** true = MUST keep `desired` (a done mirroring its plan); false = reassignable. */
    hard: boolean;
    /** stable-sort key: `(hard, desired, created, id)`. */
    sort: string;
}

const pad6 = (n: number) => String(n).padStart(6, '0');

/**
 * Assign every item a UNIQUE ordinal. Input MUST be pre-sorted (by `sort`) so phase-2
 * tie-breaks are deterministic.
 *  - phase 0: `hard` items (a done mirroring its plan) claim their ordinal first.
 *  - phase 1: `soft` items whose ordinal is unique among the remaining soft items and
 *             still free keep it — this preserves distinct ordinals and existing gaps.
 *  - phase 2: leftover soft items (collision losers) take the smallest free ordinal.
 */
function assignOrdinals(items: OrdItem[]): Map<string, number> {
    const used = new Set<number>();
    const out = new Map<string, number>();
    const smallestUnused = () => { let n = 1; while (used.has(n)) n++; return n; };

    for (const it of items) {
        if (!it.hard) continue;
        const ord = used.has(it.desired) ? smallestUnused() : it.desired;
        used.add(ord); out.set(it.file, ord);
    }

    const soft = items.filter(it => !it.hard);
    const freq = new Map<number, number>();
    for (const it of soft) freq.set(it.desired, (freq.get(it.desired) ?? 0) + 1);
    for (const it of soft) {
        if (freq.get(it.desired) === 1 && !used.has(it.desired)) {
            used.add(it.desired); out.set(it.file, it.desired);
        }
    }

    for (const it of items) {
        if (out.has(it.file)) continue;
        const ord = smallestUnused(); used.add(ord); out.set(it.file, ord);
    }
    return out;
}

/** Record every ≥2-way contest for the audit log (does not affect the assignment). */
function collectCollisions(
    out: LayoutCollision[], dirRel: string, kind: 'plan' | 'done',
    items: OrdItem[], assigned: Map<string, number>, nameFor: (o: number) => string,
): void {
    const byDesired = new Map<number, OrdItem[]>();
    for (const it of items) {
        const arr = byDesired.get(it.desired) ?? [];
        arr.push(it); byDesired.set(it.desired, arr);
    }
    for (const [desired, group] of byDesired) {
        if (group.length < 2) continue;
        out.push({
            dir: dirRel, kind, contested: desired,
            members: group.map(it => ({
                from: `${dirRel}/${it.file}`,
                to: `${dirRel}/${nameFor(assigned.get(it.file)!)}`,
                keptDesired: assigned.get(it.file) === desired,
            })),
        });
    }
}

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
    const collisions: LayoutCollision[] = [];

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
        return { dryRun, renames, skipped, collisions };
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

            // plans/ — collision-aware renumber; also map planId → NEW ordinal for done mirroring.
            const plansDir = path.join(threadDir, 'plans');
            const planIdToOrdinal = new Map<string, number>();
            {
                const items: OrdItem[] = [];
                const idByFile = new Map<string, string>();
                for (const f of await mdFiles(deps.fs, plansDir)) {
                    const ord = planOrdinalFromFile(f);
                    if (ord === null) { skipped.push({ path: rel(path.join(plansDir, f)), reason: 'no plan ordinal in filename' }); continue; }
                    let id: string | undefined, created = '';
                    try {
                        const doc = await deps.loadDoc(path.join(plansDir, f)) as { id?: string; created?: string };
                        id = doc?.id; created = String(doc?.created ?? '');
                    } catch { /* keep going; ordinal from filename still drives the rename */ }
                    if (id) idByFile.set(f, id);
                    items.push({ file: f, desired: ord, hard: false, sort: `${pad6(ord)}|${created}|${id ?? f}` });
                }
                items.sort((a, b) => (a.sort < b.sort ? -1 : a.sort > b.sort ? 1 : 0));
                const assigned = assignOrdinals(items);
                collectCollisions(collisions, rel(plansDir), 'plan', items, assigned, planFileName);
                for (const it of items) {
                    const ord = assigned.get(it.file)!;
                    const id = idByFile.get(it.file);
                    if (id) planIdToOrdinal.set(id, ord);
                    plan(path.join(plansDir, it.file), path.join(plansDir, planFileName(ord)));
                }
            }

            // done/ — mirror the parent plan's NEW ordinal when it resolves (hard), else fall
            // back to the done's own filename ordinal (soft, renumbered around the hard ones).
            const doneDir = path.join(threadDir, 'done');
            {
                const items: OrdItem[] = [];
                for (const f of await mdFiles(deps.fs, doneDir)) {
                    let parentOrd: number | null = null;
                    let created = '', id = '';
                    try {
                        const doc = await deps.loadDoc(path.join(doneDir, f)) as { id?: string; created?: string; parent_id?: string };
                        created = String(doc?.created ?? ''); id = String(doc?.id ?? '');
                        if (doc?.parent_id && planIdToOrdinal.has(doc.parent_id)) parentOrd = planIdToOrdinal.get(doc.parent_id)!;
                    } catch { /* fall through to filename ordinal */ }
                    const desired = parentOrd ?? planOrdinalFromFile(f);
                    if (desired === null) { skipped.push({ path: rel(path.join(doneDir, f)), reason: 'could not resolve plan ordinal for done doc' }); continue; }
                    const hard = parentOrd !== null;
                    items.push({ file: f, desired, hard, sort: `${hard ? '0' : '1'}|${pad6(desired)}|${created}|${id || f}` });
                }
                items.sort((a, b) => (a.sort < b.sort ? -1 : a.sort > b.sort ? 1 : 0));
                const assigned = assignOrdinals(items);
                collectCollisions(collisions, rel(doneDir), 'done', items, assigned, doneFileName);
                for (const it of items) {
                    plan(path.join(doneDir, it.file), path.join(doneDir, doneFileName(assigned.get(it.file)!)));
                }
            }

            // chats/ — {threadSlug}-chat-NNN.md → chat-NNN.md; bare/ordinal-less names get a fresh ordinal.
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

    return { dryRun, renames, skipped, collisions };
}
