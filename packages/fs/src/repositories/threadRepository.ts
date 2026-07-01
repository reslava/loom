import * as path from 'path';
import * as fs from 'fs-extra';
import { Thread } from '../../../core/dist/entities/thread';
import { IdeaDoc } from '../../../core/dist/entities/idea';
import { DesignDoc } from '../../../core/dist/entities/design';
import { PlanDoc } from '../../../core/dist/entities/plan';
import { DoneDoc } from '../../../core/dist/entities/done';
import { ChatDoc } from '../../../core/dist/entities/chat';
import { ReqDoc } from '../../../core/dist/entities/req';
import { ThreadDoc } from '../../../core/dist/entities/thread';
import { Document } from '../../../core/dist/entities/document';
import { LinkIndex } from '../../../core/dist/linkIndex';
import { loadDoc, FrontmatterParseError } from '../serializers/frontmatterLoader';
import { saveDoc } from '../serializers/frontmatterSaver';
import {
    validateParentExists,
    getDanglingChildIds,
} from '../../../core/dist/validation';
import { isIdeaFile, isDesignFile } from '../../../core/dist/docNaming';

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
    overrideThreadPath?: string,
): Promise<Thread> {
    const threadPath = overrideThreadPath ?? path.join(loomRoot, 'loom', weaveId, threadId);

    // idea/design are per-thread singletons. Dual-read: prefer the canonical flat
    // name (idea.md/design.md), fall back to the legacy thread-prefixed name so a
    // repo reads correctly before `loom migrate-layout` runs.
    let idea: IdeaDoc | undefined;
    const ideaPath = [path.join(threadPath, 'idea.md'), path.join(threadPath, `${threadId}-idea.md`)]
        .find(p => fs.existsSync(p));
    if (ideaPath) {
        idea = await loadDoc(ideaPath) as IdeaDoc;
    }

    let design: DesignDoc | undefined;
    const designPath = [path.join(threadPath, 'design.md'), path.join(threadPath, `${threadId}-design.md`)]
        .find(p => fs.existsSync(p));
    if (designPath) {
        design = await loadDoc(designPath) as DesignDoc;
    }

    // req.md — the thread's authoritative include/exclude/constraints spec.
    // Flat filename (no `${threadId}-` prefix), like ctx.md.
    let req: ReqDoc | undefined;
    const reqPath = path.join(threadPath, 'req.md');
    if (await fs.pathExists(reqPath)) {
        req = await loadDoc(reqPath) as ReqDoc;
    }

    // thread.md — the thread manifest (authored th_ ULID + priority + depends_on).
    // Flat filename (no `${threadId}-` prefix), like ctx.md and req.md.
    let manifest: ThreadDoc | undefined;
    const manifestPath = path.join(threadPath, 'thread.md');
    if (await fs.pathExists(manifestPath)) {
        manifest = await loadDoc(manifestPath) as ThreadDoc;
    }

    const plans = await loadMdFiles<PlanDoc>(path.join(threadPath, 'plans'), 'plan');
    const dones = await loadMdFiles<DoneDoc>(path.join(threadPath, 'done'), 'done');
    const chats = await loadMdFiles<ChatDoc>(path.join(threadPath, 'chats'), 'chat');
    const refDocs = await loadMdFiles<Document>(path.join(threadPath, 'refs'));

    // Constraint warnings
    const rootFiles = await fs.readdir(threadPath).catch(() => [] as string[]);
    if (rootFiles.filter(isIdeaFile).length > 1) {
        console.warn(`⚠️  [${weaveId}/${threadId}] Multiple idea docs — only one expected.`);
    }
    if (rootFiles.filter(isDesignFile).length > 1) {
        console.warn(`⚠️  [${weaveId}/${threadId}] Multiple design docs — only one expected.`);
    }

    const allDocs: Document[] = [
        ...(idea ? [idea] : []),
        ...(design ? [design] : []),
        ...(req ? [req] : []),
        ...(manifest ? [manifest] : []),
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

    return { id: threadId, weaveId, idea, design, req, manifest, plans, dones, chats, refDocs, allDocs };
}

export function docPathInThread(doc: Document, threadPath: string, threadId: string): string {
    switch (doc.type) {
        case 'idea':   return path.join(threadPath, 'idea.md');
        case 'design': return path.join(threadPath, 'design.md');
        case 'req':    return path.join(threadPath, 'req.md');
        case 'thread': return path.join(threadPath, 'thread.md');
        case 'plan':   return path.join(threadPath, 'plans', `${doc.id}.md`);
        case 'done':   return path.join(threadPath, 'done', `${doc.id}.md`);
        case 'chat':      return path.join(threadPath, 'chats', `${doc.id}.md`);
        case 'reference': return path.join(threadPath, 'refs', `${(doc as any).slug ?? doc.id}.md`);
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
