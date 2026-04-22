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
    weave?: string;
}

export interface WeaveIdeaDeps {
    getActiveLoomRoot: typeof getActiveLoomRoot;
    saveDoc: typeof saveDoc;
    fs: typeof fs;
}

export async function weaveIdea(
    input: WeaveIdeaInput,
    deps: WeaveIdeaDeps
): Promise<{ tempId: string; filePath: string }> {
    const loomRoot = deps.getActiveLoomRoot();
    const weavesDir = path.join(loomRoot, 'weaves');
    const weaveName = input.weave || toKebabCaseId(input.title);
    const weavePath = path.join(weavesDir, weaveName);

    await deps.fs.ensureDir(weavePath);

    const tempId = generateTempId('idea');
    const frontmatter = createBaseFrontmatter('idea', tempId, input.title);
    const content = generateIdeaBody(input.title);

    const doc: IdeaDoc = {
        ...frontmatter,
        content,
    } as IdeaDoc;

    const filePath = path.join(weavePath, `${tempId}.md`);
    await deps.saveDoc(doc, filePath);

    return { tempId, filePath };
}