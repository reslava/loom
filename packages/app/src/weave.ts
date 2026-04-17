import { getActiveLoomRoot } from '../../fs/dist';
import { generateTempId, toKebabCaseId } from '../../core/dist/idUtils';
import { createBaseFrontmatter, serializeFrontmatter } from '../../core/dist/frontmatterUtils';
import * as fs from 'fs-extra';
import * as path from 'path';

export interface WeaveIdeaInput {
    title: string;
    thread?: string;
}

export interface WeaveIdeaDeps {
    getActiveLoomRoot: typeof getActiveLoomRoot;
    fs: typeof fs;
}

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

    const content = `# ${input.title}

## Problem
<!-- What pain or gap does this idea address? -->

## Idea
<!-- The core concept in 2-3 sentences. -->

## Why now
<!-- What makes this worth pursuing at this point? -->

## Open questions
<!-- What needs to be answered before committing to a design? -->

## Next step
<!-- design | spike | discard -->
`;

    const frontmatterYaml = serializeFrontmatter(frontmatter);
    const output = `${frontmatterYaml}\n${content}`;
    const filePath = path.join(threadPath, `${tempId}.md`);

    await deps.fs.writeFile(filePath, output);

    return { tempId, filePath };
}