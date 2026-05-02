import * as path from 'path';
import * as fs from 'fs-extra';
import { Weave } from '../../../core/dist/entities/weave';
import { Thread } from '../../../core/dist/entities/thread';
import { Document } from '../../../core/dist/entities/document';
import { ChatDoc } from '../../../core/dist/entities/chat';
import { loadDoc, FrontmatterParseError } from '../serializers/frontmatterLoader';
import { saveDoc } from '../serializers/frontmatterSaver';
import { listThreadDirs } from '../utils/pathUtils';
import { loadThread, saveThread } from './threadRepository';
import { LinkIndex } from '../../../core/dist/linkIndex';

export async function loadWeave(loomRoot: string, weaveId: string, index?: LinkIndex): Promise<Weave | null> {
    const weavePath = path.join(loomRoot, 'loom', weaveId);
    if (!await fs.pathExists(weavePath)) {
        throw new Error(`Weave directory not found: ${weavePath}`);
    }

    // Load threads
    const threadIds = await listThreadDirs(weavePath);
    const threads: Thread[] = [];
    for (const threadId of threadIds) {
        threads.push(await loadThread(loomRoot, weaveId, threadId, index));
    }

    // Load loose fibers: .md files directly at weave root
    const looseFibers: Document[] = [];
    const rootEntries = await fs.readdir(weavePath, { withFileTypes: true });
    for (const entry of rootEntries) {
        if (!entry.isFile() || !entry.name.endsWith('.md')) continue;
        try {
            looseFibers.push(await loadDoc(path.join(weavePath, entry.name)) as Document);
        } catch (e) {
            if (e instanceof FrontmatterParseError) {
                console.warn(`Skipping ${entry.name}: ${e.message}`);
            } else throw e;
        }
    }

    // Load weave-level chats from chats/
    const chats: ChatDoc[] = [];
    const chatsDir = path.join(weavePath, 'chats');
    if (await fs.pathExists(chatsDir)) {
        const chatFiles = (await fs.readdir(chatsDir)).filter(f => f.endsWith('.md'));
        for (const f of chatFiles) {
            try {
                const doc = await loadDoc(path.join(chatsDir, f)) as Document;
                if (doc.type === 'chat') chats.push(doc as ChatDoc);
            } catch (e) {
                console.warn(`Skipping ${f}: ${(e as Error).message}`);
            }
        }
    }

    // Load weave-level reference docs from refs/
    const refDocs: Document[] = [];
    const refsDir = path.join(weavePath, 'refs');
    if (await fs.pathExists(refsDir)) {
        const refFiles = (await fs.readdir(refsDir)).filter(f => f.endsWith('.md'));
        for (const f of refFiles) {
            try {
                refDocs.push(await loadDoc(path.join(refsDir, f)) as Document);
            } catch (e) {
                console.warn(`Skipping ${f}: ${(e as Error).message}`);
            }
        }
    }

    const allDocs: Document[] = [
        ...threads.flatMap(t => t.allDocs),
        ...looseFibers,
        ...chats,
        ...refDocs,
    ];

    return { id: weaveId, threads, looseFibers, chats, refDocs, allDocs };
}

export async function saveWeave(loomRoot: string, weave: Weave): Promise<void> {
    const weavePath = path.join(loomRoot, 'loom', weave.id);

    for (const thread of weave.threads) {
        await saveThread(loomRoot, weave.id, thread);
    }

    for (const fiber of weave.looseFibers) {
        const filePath = (fiber as any)._path ?? path.join(weavePath, `${fiber.id}.md`);
        await saveDoc(fiber, filePath);
    }

    for (const chat of weave.chats) {
        const filePath = (chat as any)._path ?? path.join(weavePath, 'chats', `${chat.id}.md`);
        await saveDoc(chat, filePath);
    }
}
