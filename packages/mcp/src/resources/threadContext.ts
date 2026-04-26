import * as path from 'path';
import * as fs from 'fs-extra';
import { loadThread } from '../../../fs/dist';
import { findDocumentById } from '../../../fs/dist';
import { loadDoc } from '../../../fs/dist';
import { Document } from '../../../core/dist';

async function readFileText(filePath: string): Promise<string> {
    return fs.readFile(filePath, 'utf8');
}

async function loadRequiresLoadDocs(
    root: string,
    requiresLoad: string[],
    visited: Set<string>
): Promise<Array<{ id: string; filePath: string; content: string }>> {
    const results: Array<{ id: string; filePath: string; content: string }> = [];
    for (const refId of requiresLoad) {
        if (visited.has(refId)) continue;
        visited.add(refId);
        const refPath = await findDocumentById(root, refId);
        if (!refPath) continue;
        const content = await readFileText(refPath);
        results.push({ id: refId, filePath: refPath, content });
    }
    return results;
}

export async function handleThreadContextResource(root: string, uri: string) {
    const url = new URL(uri.replace('loom://', 'loom://host/'));
    const segments = url.pathname.replace(/^\//, '').split('/');
    // loom://thread-context/{weaveId}/{threadId}  →  [thread-context, weaveId, threadId]
    const weaveId = segments[1];
    const threadId = segments[2];

    if (!weaveId || !threadId) {
        throw new Error('loom://thread-context requires weaveId and threadId: loom://thread-context/{weaveId}/{threadId}');
    }

    const thread = await loadThread(root, weaveId, threadId);

    const sections: string[] = [];
    const visited = new Set<string>();

    // 1. Ctx summary (if present)
    const ctxDir = path.join(root, 'loom', weaveId, threadId, 'ctx');
    if (await fs.pathExists(ctxDir)) {
        const ctxFiles = (await fs.readdir(ctxDir))
            .filter(f => f.endsWith('.md'))
            .sort()
            .reverse(); // newest first (lexicographic desc)
        if (ctxFiles.length > 0) {
            const ctxContent = await readFileText(path.join(ctxDir, ctxFiles[0]));
            sections.push(`## ctx: ${path.basename(ctxFiles[0], '.md')}\n\n${ctxContent}`);
        }
    }

    // 2. Idea
    if (thread.idea) {
        visited.add(thread.idea.id);
        const ideaPath = path.join(root, 'loom', weaveId, threadId, `${threadId}-idea.md`);
        const ideaContent = await readFileText(ideaPath);
        sections.push(`## idea: ${thread.idea.id}\n\n${ideaContent}`);
    }

    // 3. Design
    if (thread.design) {
        visited.add(thread.design.id);
        const designPath = path.join(root, 'loom', weaveId, threadId, `${threadId}-design.md`);
        const designContent = await readFileText(designPath);
        sections.push(`## design: ${thread.design.id}\n\n${designContent}`);
    }

    // 4. Active plan (implementing first, then active, then first)
    const activePlan =
        thread.plans.find(p => p.status === 'implementing') ??
        thread.plans.find(p => p.status === 'active') ??
        thread.plans[0];

    if (activePlan) {
        visited.add(activePlan.id);
        const planPath = path.join(root, 'loom', weaveId, threadId, 'plans', `${activePlan.id}.md`);
        const planContent = await readFileText(planPath);
        sections.push(`## plan: ${activePlan.id}\n\n${planContent}`);
    }

    // 5. requires_load refs from idea, design, active plan
    const requiresLoad = new Set<string>([
        ...(thread.idea?.requires_load ?? []),
        ...(thread.design?.requires_load ?? []),
        ...(activePlan?.requires_load ?? []),
    ]);
    const refDocs = await loadRequiresLoadDocs(root, [...requiresLoad], visited);
    for (const ref of refDocs) {
        sections.push(`## ref: ${ref.id}\n\n${ref.content}`);
    }

    return {
        contents: [{
            uri,
            mimeType: 'text/plain',
            text: sections.join('\n\n---\n\n'),
        }],
    };
}
