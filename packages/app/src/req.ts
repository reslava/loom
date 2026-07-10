import * as path from 'path';
import * as fsExtra from 'fs-extra';
import { getActiveLoomRoot, saveDoc, loadDoc } from '../../fs/dist';
import { generateDocId, createBaseFrontmatter, ReqDoc, IdeaDoc, DesignDoc, parseReq, diffReqHandles, today } from '../../core/dist';
import { resolveThreadFolder } from './utils/resolveThreadFolder';
import { parentDesignVersion } from './weavePlan';

/**
 * Use-cases for the per-thread `req` doc — the authoritative include/exclude/
 * constraints spec. A thread has exactly one `req.md` at a deterministic flat
 * path (`loom/{weave}/{thread}/req.md`), so these use-cases key on
 * weaveSlug + threadSlug rather than a doc id.
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

function reqPathFor(loomRoot: string, weaveSlug: string, threadSlug: string): string {
    return path.join(loomRoot, 'loom', weaveSlug, threadSlug, 'req.md');
}

/**
 * The version of a thread's req when it is **locked**, else undefined.
 * Downstream doc creators stamp this onto `req_version` so re-locking the req
 * (version+1) marks the doc stale.
 */
export async function lockedReqVersion(
    loomRoot: string,
    weaveSlug: string,
    threadSlug: string,
    deps: { loadDoc: typeof loadDoc; fs: typeof fsExtra },
): Promise<number | undefined> {
    const filePath = reqPathFor(loomRoot, weaveSlug, threadSlug);
    if (!(await deps.fs.pathExists(filePath))) return undefined;
    const req = (await deps.loadDoc(filePath)) as ReqDoc;
    return req.status === 'locked' ? req.version : undefined;
}

export interface CreateReqInput {
    weaveSlug: string;
    threadUlid: string;
    title?: string;
    /** Optional body. When provided it replaces the starter stub so the doc is born at v1 with real content. */
    content?: string;
}

export async function createReq(
    input: CreateReqInput,
    deps: ReqDeps,
): Promise<{ id: string; filePath: string }> {
    const loomRoot = deps.getActiveLoomRoot();
    // Resolve the thread by its stable ULID → folder (never fabricates). Path
    // helpers below stay slug-based; resolution lives here at the boundary.
    const { threadSlug, threadPath } = await resolveThreadFolder(input.weaveSlug, input.threadUlid, deps);

    const filePath = reqPathFor(loomRoot, input.weaveSlug, threadSlug);
    if (await deps.fs.pathExists(filePath)) {
        throw new Error(
            `A req doc already exists for ${input.weaveSlug}/${threadSlug}. Use amendReq to update it.`,
        );
    }

    // Parent = the thread's DESIGN when present — a req is authored after a complete
    // design, so req depends on design and stamps the design version as its staleness
    // baseline. Fall back to the idea (req created before a design exists), then null.
    let parentId: string | null = null;
    let title = input.title ?? `${threadSlug} Requirements`;
    let designVersion: number | undefined;
    const designPath = [path.join(threadPath, 'design.md')].find(p => fsExtra.existsSync(p));
    const ideaPath = [path.join(threadPath, 'idea.md')].find(p => fsExtra.existsSync(p));
    if (designPath) {
        const design = (await deps.loadDoc(designPath)) as DesignDoc;
        parentId = design.id;
        designVersion = design.version;
        if (!input.title) title = `${design.title} — Requirements`;
    } else if (ideaPath) {
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
        ...(designVersion !== undefined ? { design_version: designVersion } : {}),
    } as ReqDoc;

    await deps.saveDoc(doc, filePath);
    return { id, filePath };
}

export interface AmendReqInput {
    weaveSlug: string;
    threadUlid: string;
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
    const { threadSlug, threadPath } = await resolveThreadFolder(input.weaveSlug, input.threadUlid, deps);
    const filePath = reqPathFor(loomRoot, input.weaveSlug, threadSlug);
    if (!(await deps.fs.pathExists(filePath))) {
        throw new Error(`No req doc for ${input.weaveSlug}/${threadSlug}. Use createReq first.`);
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

    // An amend reconciles the req against the (possibly updated) design, so re-stamp
    // the design_version baseline — this clears the req's own design-staleness.
    const design = await parentDesignVersion(threadPath, threadSlug, { loadDoc: deps.loadDoc, fs: deps.fs });

    const updated: ReqDoc = {
        ...req,
        content: input.content ?? req.content,
        status: 'draft', // re-open for curation; a locked req drops back to draft
        version: req.version + 1, // bump → marks downstream stale
        updated: today(),
        ...(design ? { design_version: design.version } : {}),
    };

    await deps.saveDoc(updated, filePath);
    return { id: req.id, filePath, version: updated.version };
}

export interface FinalizeReqInput {
    weaveSlug: string;
    threadUlid: string;
}

export async function finalizeReq(
    input: FinalizeReqInput,
    deps: ReqDeps,
): Promise<{ id: string; filePath: string; status: 'locked' }> {
    const loomRoot = deps.getActiveLoomRoot();
    const { threadSlug } = await resolveThreadFolder(input.weaveSlug, input.threadUlid, deps);
    const filePath = reqPathFor(loomRoot, input.weaveSlug, threadSlug);
    if (!(await deps.fs.pathExists(filePath))) {
        throw new Error(`No req doc for ${input.weaveSlug}/${threadSlug}.`);
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
