import * as path from 'path';
import * as fsExtra from 'fs-extra';
import { getActiveLoomRoot, saveDoc, loadDoc } from '../../fs/dist';
import { generateDocId, createBaseFrontmatter, ThreadDoc, today } from '../../core/dist';

/**
 * Use-cases for the per-thread `thread.md` manifest — the authored roadmap
 * metadata (a stable `th_` ULID identity, a soft `priority`, hard `depends_on`
 * edges). One flat `thread.md` per thread (mirrors `req.md`), so the
 * create/scaffold use-cases key on weaveId + threadId; the set-priority /
 * set-deps use-cases key on the thread's `th_` ULID (what the extension holds).
 *
 *   createThread          → new manifest with a fresh th_ ULID (empty threads)
 *   ensureThreadManifest  → idempotent scaffold (the first-create auto-seam)
 *   setThreadPriority     → the drag-reorder write
 *   setThreadDeps         → set depends_on, REFUSING cycles / unknown targets
 */

export interface ThreadManifestDeps {
    getActiveLoomRoot: typeof getActiveLoomRoot;
    saveDoc: typeof saveDoc;
    loadDoc: typeof loadDoc;
    fs: typeof fsExtra;
}

/** Minimal deps for the scaffold path (no loadDoc — title is passed in). */
export interface ScaffoldDeps {
    getActiveLoomRoot: typeof getActiveLoomRoot;
    saveDoc: typeof saveDoc;
    fs: typeof fsExtra;
}

/** Deps for the folder-shaped thread ops (rename/move) — just root + fs. */
export interface ThreadFolderDeps {
    getActiveLoomRoot: typeof getActiveLoomRoot;
    fs: typeof fsExtra;
}

const RESERVED_THREAD_IDS = new Set(['plans', 'done', 'chats', 'refs', '.archive']);

function assertValidThreadId(id: string, label: string): void {
    if (!id || id.includes('/') || id.includes('\\') || id.includes('..')) {
        throw new Error(`Invalid ${label} thread id '${id}'.`);
    }
    if (RESERVED_THREAD_IDS.has(id)) {
        throw new Error(`'${id}' is a reserved thread subfolder name, not a thread id.`);
    }
}

/**
 * Flatten any legacy {oldThreadId}-idea.md / -design.md singletons to idea.md /
 * design.md inside a thread folder. Called after a thread rename so an un-migrated
 * repo doesn't end up with a thread-prefixed singleton that no longer matches the
 * new folder name (loadThread would otherwise fail to find it). No-op post-migration.
 */
async function flattenLegacySingletons(threadDir: string, oldThreadId: string, fs: typeof fsExtra): Promise<void> {
    for (const type of ['idea', 'design'] as const) {
        const legacy = path.join(threadDir, `${oldThreadId}-${type}.md`);
        const flat = path.join(threadDir, `${type}.md`);
        if ((await fs.pathExists(legacy)) && !(await fs.pathExists(flat))) {
            await fs.move(legacy, flat, { overwrite: false });
        }
    }
}

export interface RenameThreadInput {
    weaveId: string;
    threadId: string;
    newThreadId: string;
}

/**
 * Rename a thread = rename its `loom/{weave}/{threadId}` folder (the slug). The
 * thread's stable identity (`th_` ULID in thread.md) and all docs are untouched —
 * so `depends_on` edges and every backlink survive. Legacy thread-prefixed idea/
 * design singletons are flattened to idea.md/design.md so the rename holds on an
 * un-migrated repo.
 */
export async function renameThread(
    input: RenameThreadInput,
    deps: ThreadFolderDeps,
): Promise<{ from: string; to: string }> {
    assertValidThreadId(input.threadId, 'source');
    assertValidThreadId(input.newThreadId, 'target');
    if (input.threadId === input.newThreadId) {
        return { from: input.threadId, to: input.newThreadId };
    }
    const loomRoot = deps.getActiveLoomRoot();
    const weaveDir = path.join(loomRoot, 'loom', input.weaveId);
    const from = path.join(weaveDir, input.threadId);
    const to = path.join(weaveDir, input.newThreadId);
    if (!(await deps.fs.pathExists(from))) throw new Error(`Thread '${input.weaveId}/${input.threadId}' not found.`);
    if (await deps.fs.pathExists(to)) throw new Error(`A thread '${input.weaveId}/${input.newThreadId}' already exists.`);
    await deps.fs.move(from, to, { overwrite: false });
    await flattenLegacySingletons(to, input.threadId, deps.fs);
    return { from: input.threadId, to: input.newThreadId };
}

export interface MoveThreadInput {
    fromWeaveId: string;
    threadId: string;
    toWeaveId: string;
}

/**
 * Move a thread folder to another weave. The thread's `th_` ULID travels with it, so
 * `depends_on` edges survive; docs keep their ULIDs. The threadId (folder name) is
 * unchanged, so no singleton flattening is needed. Refuses if the destination weave
 * is missing or already has a thread with this id.
 */
export async function moveThread(
    input: MoveThreadInput,
    deps: ThreadFolderDeps,
): Promise<{ from: string; to: string }> {
    assertValidThreadId(input.threadId, 'source');
    if (input.fromWeaveId === input.toWeaveId) {
        return { from: `${input.fromWeaveId}/${input.threadId}`, to: `${input.toWeaveId}/${input.threadId}` };
    }
    const loomRoot = deps.getActiveLoomRoot();
    const toWeaveDir = path.join(loomRoot, 'loom', input.toWeaveId);
    const from = path.join(loomRoot, 'loom', input.fromWeaveId, input.threadId);
    const to = path.join(toWeaveDir, input.threadId);
    if (!(await deps.fs.pathExists(from))) throw new Error(`Thread '${input.fromWeaveId}/${input.threadId}' not found.`);
    if (!(await deps.fs.pathExists(toWeaveDir))) throw new Error(`Destination weave '${input.toWeaveId}' does not exist.`);
    if (await deps.fs.pathExists(to)) throw new Error(`Destination already has a thread '${input.toWeaveId}/${input.threadId}'.`);
    await deps.fs.move(from, to, { overwrite: false });
    return { from: `${input.fromWeaveId}/${input.threadId}`, to: `${input.toWeaveId}/${input.threadId}` };
}

/** Authored baseline priority for a new manifest — mid-range, leaving slack to drag either way. */
export const NEW_THREAD_PRIORITY = 1000;

const DEFAULT_MANIFEST_BODY =
    'Thread manifest — authored roadmap metadata only (`priority` + `depends_on`). ' +
    'The thread\'s roadmap status and history are *derived* (`buildRoadmap`), never stored here.';

function manifestPathFor(loomRoot: string, weaveId: string, threadId: string): string {
    return path.join(loomRoot, 'loom', weaveId, threadId, 'thread.md');
}

export interface CreateThreadInput {
    weaveId: string;
    threadId: string;
    title?: string;
    priority?: number;
    dependsOn?: string[];
}

export async function createThread(
    input: CreateThreadInput,
    deps: ScaffoldDeps,
): Promise<{ id: string; filePath: string }> {
    const loomRoot = deps.getActiveLoomRoot();
    const threadPath = path.join(loomRoot, 'loom', input.weaveId, input.threadId);
    await deps.fs.ensureDir(threadPath);

    const filePath = manifestPathFor(loomRoot, input.weaveId, input.threadId);
    if (await deps.fs.pathExists(filePath)) {
        throw new Error(
            `A thread.md already exists for ${input.weaveId}/${input.threadId}. ` +
            `Use setThreadPriority / setThreadDeps to update it.`,
        );
    }

    const id = generateDocId('thread');
    const frontmatter = createBaseFrontmatter('thread', id, input.title ?? input.threadId, null);
    const doc: ThreadDoc = {
        ...frontmatter,
        status: 'active',
        priority: input.priority ?? NEW_THREAD_PRIORITY,
        depends_on: input.dependsOn ?? [],
        content: DEFAULT_MANIFEST_BODY,
    } as ThreadDoc;

    await deps.saveDoc(doc, filePath);
    return { id, filePath };
}

/**
 * Auto-scaffold seam: ensure the thread has a `thread.md`, creating one only if
 * absent. Idempotent and safe to call from every doc-create use-case so that the
 * first `loom_create_*` into a brand-new thread materialises its manifest — the
 * invariant "every thread has a manifest" that keeps the roadmap total.
 */
export async function ensureThreadManifest(
    weaveId: string,
    threadId: string,
    title: string | undefined,
    deps: ScaffoldDeps,
): Promise<void> {
    const loomRoot = deps.getActiveLoomRoot();
    if (await deps.fs.pathExists(manifestPathFor(loomRoot, weaveId, threadId))) return;
    await createThread({ weaveId, threadId, title }, deps);
}

interface ScannedManifest {
    weaveId: string;
    threadId: string;
    ulid: string;
    dependsOn: string[];
    filePath: string;
    archived: boolean;
}

/** Walk every `loom/{weave}/{thread}/thread.md` (live + archived). Best-effort. */
async function scanManifests(loomRoot: string, deps: ThreadManifestDeps): Promise<ScannedManifest[]> {
    const out: ScannedManifest[] = [];
    const roots = [
        { base: path.join(loomRoot, 'loom'), archived: false },
        { base: path.join(loomRoot, 'loom', '.archive'), archived: true },
    ];
    for (const { base, archived } of roots) {
        if (!(await deps.fs.pathExists(base))) continue;
        const weaves = await deps.fs.readdir(base).catch(() => [] as string[]);
        for (const w of weaves) {
            if (w === '.archive') continue;
            const wp = path.join(base, w);
            const wstat = await deps.fs.stat(wp).catch(() => null);
            if (!wstat?.isDirectory()) continue;
            const threads = await deps.fs.readdir(wp).catch(() => [] as string[]);
            for (const t of threads) {
                const mp = path.join(wp, t, 'thread.md');
                if (!(await deps.fs.pathExists(mp))) continue;
                try {
                    const d = (await deps.loadDoc(mp)) as ThreadDoc;
                    out.push({ weaveId: w, threadId: t, ulid: d.id, dependsOn: d.depends_on ?? [], filePath: mp, archived });
                } catch {
                    // skip malformed manifest
                }
            }
        }
    }
    return out;
}

/** White/grey/black DFS — true if the dependency graph contains any cycle. */
function hasCycle(graph: Map<string, string[]>): boolean {
    const WHITE = 0, GREY = 1, BLACK = 2;
    const color = new Map<string, number>();
    for (const k of graph.keys()) color.set(k, WHITE);
    const dfs = (u: string): boolean => {
        color.set(u, GREY);
        for (const v of graph.get(u) ?? []) {
            const c = color.get(v);
            if (c === undefined) continue; // external/unknown target — not part of the graph
            if (c === GREY) return true;
            if (c === WHITE && dfs(v)) return true;
        }
        color.set(u, BLACK);
        return false;
    };
    for (const k of graph.keys()) if (color.get(k) === WHITE && dfs(k)) return true;
    return false;
}

export async function setThreadPriority(
    input: { threadUlid: string; priority: number },
    deps: ThreadManifestDeps,
): Promise<{ id: string; filePath: string; priority: number }> {
    const loomRoot = deps.getActiveLoomRoot();
    const all = await scanManifests(loomRoot, deps);
    const target = all.find(m => m.ulid === input.threadUlid && !m.archived);
    if (!target) throw new Error(`No live thread.md with id ${input.threadUlid}.`);

    const doc = (await deps.loadDoc(target.filePath)) as ThreadDoc;
    const updated: ThreadDoc = { ...doc, priority: input.priority, updated: today() };
    await deps.saveDoc(updated, target.filePath);
    return { id: doc.id, filePath: target.filePath, priority: input.priority };
}

export async function setThreadDeps(
    input: { threadUlid: string; dependsOn: string[] },
    deps: ThreadManifestDeps,
): Promise<{ id: string; filePath: string; dependsOn: string[] }> {
    const loomRoot = deps.getActiveLoomRoot();
    const all = await scanManifests(loomRoot, deps);
    const target = all.find(m => m.ulid === input.threadUlid && !m.archived);
    if (!target) throw new Error(`No live thread.md with id ${input.threadUlid}.`);

    // Existence: every dependency must resolve to a known manifest (live or archived).
    const known = new Set(all.map(m => m.ulid));
    const missing = input.dependsOn.filter(d => !known.has(d));
    if (missing.length > 0) {
        throw new Error(`Write refused: depends_on references unknown thread(s): ${missing.join(', ')}.`);
    }
    if (input.dependsOn.includes(input.threadUlid)) {
        throw new Error('Write refused: a thread cannot depend on itself.');
    }

    // Cycle: build the graph with the proposed change and refuse if it introduces one.
    const graph = new Map<string, string[]>();
    for (const m of all) {
        graph.set(m.ulid, m.ulid === input.threadUlid ? [...input.dependsOn] : [...m.dependsOn]);
    }
    if (hasCycle(graph)) {
        throw new Error('Write refused: these dependencies would introduce a cycle in the thread graph.');
    }

    const doc = (await deps.loadDoc(target.filePath)) as ThreadDoc;
    const updated: ThreadDoc = { ...doc, depends_on: [...input.dependsOn], updated: today() };
    await deps.saveDoc(updated, target.filePath);
    return { id: doc.id, filePath: target.filePath, dependsOn: input.dependsOn };
}
