import * as fs from 'fs-extra';
import * as path from 'path';
import { getActiveLoomRoot } from '../../fs/dist';
import { saveDoc } from '../../fs/dist';
import { generateDocId, toKebabCaseId, singletonFileName } from '../../core/dist';
import { createBaseFrontmatter } from '../../core/dist';
import { generateIdeaBody } from '../../core/dist';
import { IdeaDoc } from '../../core/dist';
import { loadDoc } from '../../fs/dist';
import { resolveThreadFolder } from './utils/resolveThreadFolder';

export interface CreateIdeaInput {
    title: string;
    weaveSlug?: string;
    threadUlid?: string;
    /** Optional body. When provided, it replaces the generated stub so the doc is born at version 1 with real content. */
    content?: string;
}

export interface CreateIdeaDeps {
    getActiveLoomRoot: typeof getActiveLoomRoot;
    saveDoc: typeof saveDoc;
    loadDoc: typeof loadDoc;
    fs: typeof fs;
}

export async function createIdea(
    input: CreateIdeaInput,
    deps: CreateIdeaDeps
): Promise<{ id: string; filePath: string }> {
    const weaveName = input.weaveSlug || toKebabCaseId(input.title);

    // Invariant: every doc lives in a thread, referenced by its stable th_ ULID.
    // Weave-root idea creation is retired — a thread_ulid is required.
    if (!input.threadUlid) {
        throw new Error('Cannot create an idea: a thread_ulid is required. Create the thread first (createThread) and pass its returned thread_ulid.');
    }

    // Resolve the thread by its stable ULID → folder. Never fabricates: an unknown
    // thread_ulid throws (createThread is the only way to make a thread).
    const { threadPath } = await resolveThreadFolder(weaveName, input.threadUlid, deps);
    const id = generateDocId('idea');
    const frontmatter = createBaseFrontmatter('idea', id, input.title);
    const content = input.content ?? generateIdeaBody(input.title);
    const doc: IdeaDoc = { ...frontmatter, content } as IdeaDoc;
    const filePath = path.join(threadPath, singletonFileName('idea'));
    await deps.saveDoc(doc, filePath);
    return { id, filePath };
}
