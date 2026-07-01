import * as fs from 'fs-extra';
import * as path from 'path';
import { saveDoc } from '../../fs/dist';
import { generateDocId, createBaseFrontmatter, nextOrdinal, chatFileName } from '../../core/dist';
import { ChatDoc } from '../../core/dist';
import { getUserName } from './utils/chatNames';

export interface ChatNewInput {
    weaveId?: string;
    threadId?: string;
    title?: string;
}

export interface ChatNewDeps {
    saveDoc: typeof saveDoc;
    fs: typeof fs;
    loomRoot: string;
}

export async function chatNew(
    input: ChatNewInput,
    deps: ChatNewDeps
): Promise<{ id: string; filePath: string }> {
    const chatsDir = !input.weaveId
        ? path.join(deps.loomRoot, 'loom', 'chats')
        : input.threadId
            ? path.join(deps.loomRoot, 'loom', input.weaveId, input.threadId, 'chats')
            : path.join(deps.loomRoot, 'loom', input.weaveId, 'chats');
    await deps.fs.ensureDir(chatsDir);

    const existingFiles = await deps.fs.readdir(chatsDir).catch(() => [] as string[]);

    const scopeId = input.threadId ?? input.weaveId ?? 'global';
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
