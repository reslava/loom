import * as fs from 'fs-extra';
import * as path from 'path';
import { getActiveLoomRoot } from '../../fs/dist';
import { saveDoc } from '../../fs/dist';
import { loadDoc } from '../../fs/dist';
import { generateDocId, generatePermanentId, singletonFileName } from '../../core/dist';
import { createBaseFrontmatter } from '../../core/dist';
import { today } from '../../core/dist';
import { generateDesignBody } from '../../core/dist';
import { DesignDoc, IdeaDoc } from '../../core/dist';
import { getUserName } from './utils/chatNames';
import { resolveThreadFolder } from './utils/resolveThreadFolder';

export interface CreateDesignInput {
    weaveSlug: string;
    title?: string;
    threadUlid?: string;
    /** Optional body. When provided, it replaces the generated stub so the doc is born at version 1 with real content. */
    content?: string;
}

export interface CreateDesignDeps {
    getActiveLoomRoot: typeof getActiveLoomRoot;
    saveDoc: typeof saveDoc;
    loadDoc: typeof loadDoc;
    fs: typeof fs;
}

interface IdeaInfo {
    id: string;
    title: string;
    status: string;
    filePath: string;
    content: string;
}

/**
 * Finds any idea document in the weave directory (temporary or finalized).
 */
async function findIdeaFile(weavePath: string, deps: CreateDesignDeps): Promise<IdeaInfo | null> {
    const entries = await deps.fs.readdir(weavePath, { withFileTypes: true });
    for (const entry of entries) {
        if (!entry.isFile() || !entry.name.endsWith('-idea.md')) continue;
        
        const ideaPath = path.join(weavePath, entry.name);
        const content = await deps.fs.readFile(ideaPath, 'utf8');
        const idMatch = content.match(/^id:\s*["']?(.+?)["']?\s*$/m);
        const titleMatch = content.match(/^title:\s*["']?(.+?)["']?\s*$/m);
        const statusMatch = content.match(/^status:\s*["']?(.+?)["']?\s*$/m);
        
        return {
            id: idMatch ? idMatch[1] : path.basename(entry.name, '.md'),
            title: titleMatch ? titleMatch[1] : path.basename(entry.name, '-idea.md'),
            status: statusMatch ? statusMatch[1] : 'draft',
            filePath: ideaPath,
            content,
        };
    }
    return null;
}

/**
 * Finalizes a draft idea = flips its status to active. The permanent ULID id and
 * the filename are left as created — finalize never re-mints the id from the title.
 */
async function finalizeIdea(
    ideaPath: string,
    deps: CreateDesignDeps
): Promise<{ newId: string; title: string }> {
    const idea = await deps.loadDoc(ideaPath) as IdeaDoc;

    if (idea.status !== 'draft') {
        return { newId: idea.id, title: idea.title };
    }

    const updatedIdea: IdeaDoc = {
        ...idea,
        status: 'active',
        updated: today(),
    };

    await deps.saveDoc(updatedIdea, ideaPath);

    return { newId: idea.id, title: idea.title };
}

/**
 * Creates a new design document.
 * If an idea exists in the weave, it is used as the parent (and auto‑finalized if temporary).
 * If no idea exists, the design is created with no parent.
 */
export async function createDesign(
    input: CreateDesignInput,
    deps: CreateDesignDeps
): Promise<{ id: string; filePath: string; autoFinalized: boolean }> {
    const loomRoot = deps.getActiveLoomRoot();

    // Invariant: every doc lives in a thread, referenced by its stable th_ ULID.
    // Weave-root design creation is retired — a thread_ulid is required.
    if (!input.threadUlid) {
        throw new Error('Cannot create a design: a thread_ulid is required. Create the thread first (createThread) and pass its returned thread_ulid.');
    }

    // Resolve the thread by its stable ULID → folder (never fabricates).
    const { threadSlug, threadPath } = await resolveThreadFolder(input.weaveSlug, input.threadUlid, deps);
    const ideaPath = path.join(threadPath, 'idea.md');
    const hasIdea = await deps.fs.pathExists(ideaPath);
    let parentId: string | null = null;
    let designTitle = input.title || threadSlug;
    let ideaVersion: number | undefined;
    if (hasIdea) {
        const idea = await deps.loadDoc(ideaPath) as IdeaDoc;
        parentId = idea.id;
        designTitle = input.title || idea.title;
        ideaVersion = idea.version;
    }
    const id = generateDocId('design');
    const frontmatter = createBaseFrontmatter('design', id, designTitle, parentId);
    const content = input.content ?? generateDesignBody(designTitle, getUserName(loomRoot));
    // Stamp the idea version this design was built against (its staleness baseline).
    const doc: DesignDoc = { ...frontmatter, content, ...(ideaVersion !== undefined ? { idea_version: ideaVersion } : {}) } as DesignDoc;
    const filePath = path.join(threadPath, singletonFileName('design'));
    await deps.saveDoc(doc, filePath);
    return { id, filePath, autoFinalized: false };
}