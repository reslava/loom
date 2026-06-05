import * as path from 'path';
import * as fsExtra from 'fs-extra';
import { getActiveLoomRoot, saveDoc, loadDoc } from '../../fs/dist';
import { generateDocId, createBaseFrontmatter, ReqDoc, IdeaDoc } from '../../core/dist';

/**
 * Use-cases for the per-thread `req` doc — the authoritative include/exclude/
 * constraints spec. A thread has exactly one `req.md` at a deterministic flat
 * path (`loom/{weave}/{thread}/req.md`), so these use-cases key on
 * weaveId + threadId rather than a doc id.
 *
 *   create  → new draft req (parented to the thread idea if present)
 *   refine  → update body, re-open to draft, bump version (→ downstream stale, Ph2)
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
            `A req doc already exists for ${input.weaveId}/${input.threadId}. Use refineReq to update it.`,
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
    return { id, filePath };
}

export interface RefineReqInput {
    weaveId: string;
    threadId: string;
    /** New body. Omit to leave the body unchanged (a pure re-open). */
    content?: string;
}

export async function refineReq(
    input: RefineReqInput,
    deps: ReqDeps,
): Promise<{ id: string; filePath: string; version: number }> {
    const loomRoot = deps.getActiveLoomRoot();
    const filePath = reqPathFor(loomRoot, input.weaveId, input.threadId);
    if (!(await deps.fs.pathExists(filePath))) {
        throw new Error(`No req doc for ${input.weaveId}/${input.threadId}. Use createReq first.`);
    }

    const req = (await deps.loadDoc(filePath)) as ReqDoc;
    const updated: ReqDoc = {
        ...req,
        content: input.content ?? req.content,
        status: 'draft', // re-open for curation; a locked req drops back to draft
        version: req.version + 1, // bump → marks downstream stale (Phase 2 staleness)
        updated: new Date().toISOString().split('T')[0],
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
        updated: new Date().toISOString().split('T')[0],
    };

    await deps.saveDoc(updated, filePath);
    return { id: req.id, filePath, status: 'locked' };
}
