import * as fs from 'fs-extra';
import * as path from 'path';
import { saveDoc } from '../../fs/dist';
import { generateChatId, createBaseFrontmatter } from '../../core/dist';
import { ChatDoc } from '../../core/dist';

export interface ChatNewInput {
    weaveId: string;
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
    const chatsDir = input.threadId
        ? path.join(deps.loomRoot, 'loom', input.weaveId, input.threadId, 'chats')
        : path.join(deps.loomRoot, 'loom', input.weaveId, 'chats');
    await deps.fs.ensureDir(chatsDir);

    const existingFiles = await deps.fs.readdir(chatsDir).catch(() => [] as string[]);
    const existingChatIds = existingFiles
        .filter(f => f.match(/-chat-\d+\.md$/))
        .map(f => f.replace(/\.md$/, ''));

    const scopeId = input.threadId ?? input.weaveId;
    const chatId = generateChatId(scopeId, existingChatIds);
    const title = input.title || `${scopeId} Chat`;

    const frontmatter = createBaseFrontmatter('chat', chatId, title, scopeId);
    const doc: ChatDoc = {
        ...frontmatter,
        type: 'chat',
        status: 'active',
        content: '# CHAT\n\n## Rafa:\n',
    };

    const filePath = path.join(chatsDir, `${chatId}.md`);
    await deps.saveDoc(doc, filePath);

    return { id: chatId, filePath };
}
