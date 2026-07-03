import * as fs from 'fs-extra';
import * as path from 'path';
import { saveDoc, loadDoc } from '../../fs/dist';
import { generateDocId, createBaseFrontmatter, nextOrdinal, chatFileName } from '../../core/dist';
import { ChatDoc } from '../../core/dist';
import { getUserName } from './utils/chatNames';
import { resolveThreadFolder } from './utils/resolveThreadFolder';

export interface ChatNewInput {
    weaveId?: string;
    threadId?: string;
    title?: string;
}

export interface ChatNewDeps {
    saveDoc: typeof saveDoc;
    loadDoc: typeof loadDoc;
    fs: typeof fs;
    loomRoot: string;
}

export async function chatNew(
    input: ChatNewInput,
    deps: ChatNewDeps
): Promise<{ id: string; filePath: string }> {
    // Resolve the thread by its stable ULID → folder when a thread is targeted
    // (never fabricates); weave-root and global chats need no resolution.
    let chatsDir: string;
    let scopeId: string;
    if (!input.weaveId) {
        chatsDir = path.join(deps.loomRoot, 'loom', 'chats');
        scopeId = 'global';
    } else if (input.threadId) {
        const { threadSlug, threadPath } = await resolveThreadFolder(input.weaveId, input.threadId, {
            getActiveLoomRoot: () => deps.loomRoot, loadDoc: deps.loadDoc, fs: deps.fs,
        });
        chatsDir = path.join(threadPath, 'chats');
        scopeId = threadSlug;
    } else {
        chatsDir = path.join(deps.loomRoot, 'loom', input.weaveId, 'chats');
        scopeId = input.weaveId;
    }
    await deps.fs.ensureDir(chatsDir);

    const existingFiles = await deps.fs.readdir(chatsDir).catch(() => [] as string[]);
    // Canonical flat chat filename: chat-NNN.md (ordinal recognises legacy names too).
    const chatFilename = chatFileName(nextOrdinal(existingFiles, 'chat'));
    const chatId = generateDocId('chat');
    const title = input.title || `${scopeId} Chat`;

    const frontmatter = createBaseFrontmatter('chat', chatId, title, null);
    const doc: ChatDoc = {
        ...frontmatter,
        type: 'chat',
        status: 'active',
        content: `## ${getUserName(deps.loomRoot)}\n`,
    };

    const filePath = path.join(chatsDir, chatFilename);
    await deps.saveDoc(doc, filePath);

    return { id: chatId, filePath };
}
