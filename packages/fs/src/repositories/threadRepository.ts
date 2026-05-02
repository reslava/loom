import * as path from 'path';
import * as fs from 'fs-extra';
import { Thread } from '../../../core/dist/entities/thread';
import { IdeaDoc } from '../../../core/dist/entities/idea';
import { DesignDoc } from '../../../core/dist/entities/design';
import { PlanDoc } from '../../../core/dist/entities/plan';
import { DoneDoc } from '../../../core/dist/entities/done';
import { ChatDoc } from '../../../core/dist/entities/chat';
import { Document } from '../../../core/dist/entities/document';
import { LinkIndex } from '../../../core/dist/linkIndex';
import { loadDoc, FrontmatterParseError } from '../serializers/frontmatterLoader';
import { saveDoc } from '../serializers/frontmatterSaver';
import {
    validateParentExists,
    getDanglingChildIds,
} from '../../../core/dist/validation';

async function loadMdFiles<T extends Document>(dir: string, typeName?: string): Promise<T[]> {
    if (!await fs.pathExists(dir)) return [];
    const files = (await fs.readdir(dir)).filter(f => f.endsWith('.md'));
    const results: T[] = [];
    for (const f of files) {
        try {
            const doc = await loadDoc(path.join(dir, f)) as Document;
            if (!typeName || doc.type === typeName) results.push(doc as T);
        } catch (e) {
            if (e instanceof FrontmatterParseError) {
                console.warn(`[loadThread] Skipping ${f}: ${e.message}`);
            } else throw e;
        }
    }
    return results;
}

export async function loadThread(
    loomRoot: string,
    weaveId: string,
    threadId: string,
    index?: LinkIndex,
): Promise<Thread> {
    const threadPath = path.join(loomRoot, 'loom', weaveId, threadId);

    let idea: IdeaDoc | undefined;
    const ideaPath = path.join(threadPath, `${threadId}-idea.md`);
    if (await fs.pathExists(ideaPath)) {
        idea = await loadDoc(ideaPath) as IdeaDoc;
    }

    let design: DesignDoc | undefined;
    const designPath = path.join(threadPath, `${threadId}-design.md`);
    if (await fs.pathExists(designPath)) {
        design = await loadDoc(designPath) as DesignDoc;
    }

    const plans = await loadMdFiles<PlanDoc>(path.join(threadPath, 'plans'), 'plan');
    const dones = await loadMdFiles<DoneDoc>(path.join(threadPath, 'done'), 'done');
    const chats = await loadMdFiles<ChatDoc>(path.join(threadPath, 'chats'), 'chat');
    const refDocs = await loadMdFiles<Document>(path.join(threadPath, 'refs'));

    // Constraint warnings
    const rootFiles = await fs.readdir(threadPath).catch(() => [] as string[]);
    if (rootFiles.filter(f => f.endsWith('-idea.md')).length > 1) {
        console.warn(`⚠️  [${weaveId}/${threadId}] Multiple idea docs — only one expected.`);
    }
    if (rootFiles.filter(f => f.endsWith('-design.md')).length > 1) {
        console.warn(`⚠️  [${weaveId}/${threadId}] Multiple design docs — only one expected.`);
    }

    const allDocs: Document[] = [
        ...(idea ? [idea] : []),
        ...(design ? [design] : []),
        ...plans,
        ...dones,
        ...chats,
        ...refDocs,
    ];

    if (index) {
        for (const doc of allDocs) {
            if (doc.parent_id && !validateParentExists(doc, index)) {
                console.warn(`⚠️  [${doc.id}] Broken parent_id: ${doc.parent_id}`);
            }
            const dangling = getDanglingChildIds(doc, index);
            for (const childId of dangling) {
                console.warn(`⚠️  [${doc.id}] Dangling child_id: ${childId}`);
            }
        }
    }

    return { id: threadId, weaveId, idea, design, plans, dones, chats, refDocs, allDocs };
}

function docPathInThread(doc: Document, threadPath: string, threadId: string): string {
    switch (doc.type) {
        case 'idea':   return path.join(threadPath, `${threadId}-idea.md`);
        case 'design': return path.join(threadPath, `${threadId}-design.md`);
        case 'plan':   return path.join(threadPath, 'plans', `${doc.id}.md`);
        case 'done':   return path.join(threadPath, 'done', `${doc.id}.md`);
        case 'chat':   return path.join(threadPath, 'chats', `${doc.id}.md`);
        default: throw new Error(`Unknown doc type for thread: ${doc.type}`);
    }
}

export async function saveThread(loomRoot: string, weaveId: string, thread: Thread): Promise<void> {
    const threadPath = path.join(loomRoot, 'loom', weaveId, thread.id);
    for (const doc of thread.allDocs) {
        const filePath = (doc as any)._path ?? docPathInThread(doc, threadPath, thread.id);
        await saveDoc(doc, filePath);
    }
}
