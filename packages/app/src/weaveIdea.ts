import * as fs from 'fs-extra';
import * as path from 'path';
import { getActiveLoomRoot } from '../../fs/dist';
import { saveDoc } from '../../fs/dist';
import { generateTempId, toKebabCaseId } from '../../core/dist';
import { createBaseFrontmatter } from '../../core/dist';
import { generateIdeaBody } from '../../core/dist';
import { IdeaDoc } from '../../core/dist';

export interface WeaveIdeaInput {
    title: string;
    thread?: string;
}

export interface WeaveIdeaDeps {
    getActiveLoomRoot: typeof getActiveLoomRoot;
    saveDoc: typeof saveDoc;
    fs: typeof fs;
}

/**
 * Creates a new idea document in the active loom.
 *
 * @param input - The title and optional thread name.
 * @param deps - Filesystem and document saving dependencies.
 * @returns A promise resolving to the temporary ID and file path.
 */
export async function weaveIdea(
    input: WeaveIdeaInput,
    deps: WeaveIdeaDeps
): Promise<{ tempId: string; filePath: string }> {
    const loomRoot = deps.getActiveLoomRoot();
    const threadsDir = path.join(loomRoot, 'threads');
    const threadName = input.thread || toKebabCaseId(input.title);
    const threadPath = path.join(threadsDir, threadName);

    await deps.fs.ensureDir(threadPath);

    const tempId = generateTempId('idea');
    const frontmatter = createBaseFrontmatter('idea', tempId, input.title);
    const content = generateIdeaBody(input.title);

    const doc: IdeaDoc = {
        ...frontmatter,
        content,
    } as IdeaDoc;

    const filePath = path.join(threadPath, `${tempId}.md`);
    await deps.saveDoc(doc, filePath);

    return { tempId, filePath };
}