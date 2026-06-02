import * as fs from 'fs-extra';
import * as path from 'path';
import { getActiveLoomRoot } from '../../fs/dist';
import { saveDoc } from '../../fs/dist';
import { generateDocId, toKebabCaseId } from '../../core/dist';
import { createBaseFrontmatter } from '../../core/dist';
import { generateIdeaBody } from '../../core/dist';
import { IdeaDoc } from '../../core/dist';

export interface WeaveIdeaInput {
    title: string;
    weave?: string;
    threadId?: string;
    /** Optional body. When provided, it replaces the generated stub so the doc is born at version 1 with real content. */
    content?: string;
}

export interface WeaveIdeaDeps {
    getActiveLoomRoot: typeof getActiveLoomRoot;
    saveDoc: typeof saveDoc;
    fs: typeof fs;
}

export async function weaveIdea(
    input: WeaveIdeaInput,
    deps: WeaveIdeaDeps
): Promise<{ id: string; filePath: string }> {
    const loomRoot = deps.getActiveLoomRoot();
    const weavesDir = path.join(loomRoot, 'loom');
    const weaveName = input.weave || toKebabCaseId(input.title);
    const weavePath = path.join(weavesDir, weaveName);

    if (input.threadId) {
        const threadPath = path.join(weavePath, input.threadId);
        await deps.fs.ensureDir(threadPath);
        const id = generateDocId('idea');
        const filename = `${input.threadId}-idea`;
        const frontmatter = createBaseFrontmatter('idea', id, input.title);
        const content = input.content ?? generateIdeaBody(input.title);
        const doc: IdeaDoc = { ...frontmatter, content } as IdeaDoc;
        const filePath = path.join(threadPath, `${filename}.md`);
        await deps.saveDoc(doc, filePath);
        return { id, filePath };
    }

    await deps.fs.ensureDir(weavePath);
    const id = generateDocId('idea');
    const filename = toKebabCaseId(input.title) + '-idea';
    const frontmatter = createBaseFrontmatter('idea', id, input.title);
    const content = input.content ?? generateIdeaBody(input.title);
    const doc: IdeaDoc = { ...frontmatter, content } as IdeaDoc;
    const filePath = path.join(weavePath, `${filename}.md`);
    await deps.saveDoc(doc, filePath);
    return { id, filePath };
}
