import chalk from 'chalk';
import * as fs from 'fs-extra';
import * as path from 'path';
import { getActiveLoomRoot } from '../../../fs/dist';
import { saveDoc } from '../../../fs/dist';
import { generateTempId, toKebabCaseId } from '../../../core/dist';
import { createBaseFrontmatter } from '../../../core/dist';
import { generateIdeaBody } from '../../../core/dist';
import { IdeaDoc } from '../../../core/dist';

export async function weaveIdeaCommand(title: string, options: { weave?: string; thread?: string; loose?: boolean }): Promise<void> {
    const loomRoot = getActiveLoomRoot();
    const weavesDir = path.join(loomRoot, 'loom');
    const weaveName = options.weave || toKebabCaseId(title);
    const weavePath = path.join(weavesDir, weaveName);

    const threadId = options.loose ? undefined : (options.thread || toKebabCaseId(title));

    if (threadId) {
        const threadPath = path.join(weavePath, threadId);
        await fs.ensureDir(threadPath);
        const ideaId = `${threadId}-idea`;
        const frontmatter = createBaseFrontmatter('idea', ideaId, title);
        const content = generateIdeaBody(title);
        const doc: IdeaDoc = { ...frontmatter, content } as IdeaDoc;
        const filePath = path.join(threadPath, `${ideaId}.md`);
        await saveDoc(doc, filePath);
        console.log(chalk.green(`🧵 Idea woven at ${filePath}`));
        console.log(chalk.gray(`   Thread: ${threadId}  ID: ${ideaId}`));
        return;
    }

    await fs.ensureDir(weavePath);
    const tempId = generateTempId('idea');
    const frontmatter = createBaseFrontmatter('idea', tempId, title);
    const content = generateIdeaBody(title);
    const doc: IdeaDoc = { ...frontmatter, content } as IdeaDoc;
    const filePath = path.join(weavePath, `${tempId}.md`);
    await saveDoc(doc, filePath);
    console.log(chalk.green(`🧵 Idea woven at ${filePath}`));
    console.log(chalk.gray(`   Temporary ID: ${tempId}`));
    console.log(chalk.gray(`   Run 'loom finalize ${tempId}' when the title is final.`));
}