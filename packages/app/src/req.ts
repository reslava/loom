import * as path from 'path';
import * as fsExtra from 'fs-extra';
import { getActiveLoomRoot, saveDoc, loadDoc } from '../../fs/dist';
import { generateDocId, createBaseFrontmatter, ReqDoc, IdeaDoc, parseReq, diffReqHandles, today } from '../../core/dist';
import { ensureThreadManifest } from './thread';

/**
 * Use-cases for the per-thread `req` doc — the authoritative include/exclude/
 * constraints spec. A thread has exactly one `req.md` at a deterministic flat
 * path (`loom/{weave}/{thread}/req.md`), so these use-cases key on
 * weaveId + threadId rather than a doc id.
 *
 *   create  → new draft req (parented to the thread idea if present)
 *   amend   → reconcile new/changed requirements under append-only rules
 *             (never renumber or delete a handle), re-open to draft, bump version
 *   finalize→ draft → locked (the explicit anchor)
 */

export interface ReqDeps {
    getActiveLoomRoot: typeof getActiveLoomRoot;
    saveDoc: typeof saveDoc;
    loadDoc: typeof loadDoc;
    fs: typeof fsExtra;
}

/** Minimal starter body: the three lists, ready for curation. */
const DEFAULT_REQ_BODY = [
    '### ✅ Included',
    '',
    '### ❌ Excluded',
    '',
    '### ⛓ Constraints',
    '',
].join('\n');

function reqPathFor(loomRoot: string, weaveId: string, threadId: string): string {
    return path.join(loomRoot, 'loom', weaveId, threadId, 'req.md');
}

/**
 * The version of a thread's req when it is **locked**, else undefined.
 * Downstream doc creators stamp this onto `req_version` so re-locking the req
 * (version+1) marks the doc stale.
 */
export async function lockedReqVersion(
    loomRoot: string,
    weaveId: string,
    threadId: string,
    deps: { loadDoc: typeof loadDoc; fs: typeof fsExtra },
): Promise<number | undefined> {
    const filePath = reqPathFor(loomRoot, weaveId, threadId);
    if (!(await deps.fs.pathExists(filePath))) return undefined;
    const req = (await deps.loadDoc(filePath)) as ReqDoc;
    return req.status === 'locked' ? req.version : undefined;
}

export interface CreateReqInput {
    weaveId: string;
    threadId: string;
    title?: string;
    /** Optional body. When provided it replaces the starter stub so the doc is born at v1 with real content. */
    content?: string;
}

export async function createReq(
    input: CreateReqInput,
    deps: ReqDeps,
): Promise<{ id: string; filePath: string }> {
    const loomRoot = deps.getActiveLoomRoot();
    const threadPath = path.join(loomRoot, 'loom', input.weaveId, input.threadId);
    await deps.fs.ensureDir(threadPath);

    const filePath = reqPathFor(loomRoot, input.weaveId, input.threadId);
    if (await deps.fs.pathExists(filePath)) {
        throw new Error(
            `A req doc already exists for ${input.weaveId}/${input.threadId}. Use amendReq to update it.`,
        );
    }

    // Parent = the thread's idea, when present (graph linkage; req is born first
    // in the chain but links up to the idea once one exists).
    let parentId: string | null = null;
    let title = input.title ?? `${input.threadId} Requirements`;
    const ideaPath = path.join(threadPath, `${input.threadId}-idea.md`);
    if (await deps.fs.pathExists(ideaPath)) {
        const idea = (await deps.loadDoc(ideaPath)) as IdeaDoc;
        parentId = idea.id;
        if (!input.title) title = `${idea.title} — Requirements`;
    }

    const id = generateDocId('req');
    const frontmatter = createBaseFrontmatter('req', id, title, parentId);
    const doc: ReqDoc = {
        ...frontmatter,
        status: 'draft',
        content: input.content ?? DEFAULT_REQ_BODY,
    } as ReqDoc;

    await deps.saveDoc(doc, filePath);
    // Auto-scaffold the thread manifest (first-create seam) so the thread is on the roadmap.
    await ensureThreadManifest(input.weaveId, input.threadId, title, deps);
    return { id, filePath };
}

export interface AmendReqInput {
    weaveId: string;
    threadId: string;
    /** New body. Omit to leave the body unchanged (a pure re-open). */
    content?: string;
}

/**
 * Amend a thread's req: reconcile a new body into the spec under **append-only**
 * rules, then re-open (locked → draft) and bump version (→ downstream stale).
 *
 * Requirement handles (`IN`/`EX`/`C`) are citation targets — plan steps point at
 * them via `satisfies` — so the use-case refuses any body that deletes or
 * renumbers an existing handle. New handles may be appended; an obsolete one is
 * retired by marking it `~dropped` (which keeps the handle present), never by
 * removing it. A pure re-open (no `content`) skips the check.
 */
export async function amendReq(
    input: AmendReqInput,
    deps: ReqDeps,
): Promise<{ id: string; filePath: string; version: number }> {
    const loomRoot = deps.getActiveLoomRoot();
    const filePath = reqPathFor(loomRoot, input.weaveId, input.threadId);
    if (!(await deps.fs.pathExists(filePath))) {
        throw new Error(`No req doc for ${input.weaveId}/${input.threadId}. Use createReq first.`);
    }

    const req = (await deps.loadDoc(filePath)) as ReqDoc;

    // Referential integrity: an incoming body may add handles or retire them
    // (~dropped), but must never renumber or delete an existing one.
    if (input.content !== undefined) {
        const diff = diffReqHandles(parseReq(req.content ?? ''), parseReq(input.content));
        if (!diff.ok) {
            throw new Error(
                `Amend refused: requirement handles are immutable, but this body drops ${diff.deleted.join(', ')}. ` +
                `Append new handles instead, and retire an obsolete one by marking it \`~dropped\` (do not delete or renumber).`,
            );
        }
    }

    const updated: ReqDoc = {
        ...req,
        content: input.content ?? req.content,
        status: 'draft', // re-open for curation; a locked req drops back to draft
        version: req.version + 1, // bump → marks downstream stale
        updated: today(),
    };

    await deps.saveDoc(updated, filePath);
    return { id: req.id, filePath, version: updated.version };
}

export interface FinalizeReqInput {
    weaveId: string;
    threadId: string;
}

export async function finalizeReq(
    input: FinalizeReqInput,
    deps: ReqDeps,
): Promise<{ id: string; filePath: string; status: 'locked' }> {
    const loomRoot = deps.getActiveLoomRoot();
    const filePath = reqPathFor(loomRoot, input.weaveId, input.threadId);
    if (!(await deps.fs.pathExists(filePath))) {
        throw new Error(`No req doc for ${input.weaveId}/${input.threadId}.`);
    }

    const req = (await deps.loadDoc(filePath)) as ReqDoc;
    if (req.status === 'locked') {
        return { id: req.id, filePath, status: 'locked' }; // idempotent
    }

    const updated: ReqDoc = {
        ...req,
        status: 'locked',
        updated: today(),
    };

    await deps.saveDoc(updated, filePath);
    return { id: req.id, filePath, status: 'locked' };
}
