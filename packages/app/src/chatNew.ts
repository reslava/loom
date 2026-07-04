import * as fs from 'fs-extra';
import * as path from 'path';
import { saveDoc, loadDoc } from '../../fs/dist';
import { generateDocId, createBaseFrontmatter, nextOrdinal, chatFileName } from '../../core/dist';
import { ChatDoc } from '../../core/dist';
import { getUserName } from './utils/chatNames';
import { resolveThreadFolder } from './utils/resolveThreadFolder';

export interface ChatNewInput {
    weaveSlug?: string;
    threadUlid?: string;
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
    // A chat has exactly two canonical homes: refs/chats, or {weave}/{thread}/chats.
    // Anything else — a weave with no resolvable thread, or no weave at all — is not
    // a valid chat location and MUST error rather than silently orphan an invalid,
    // tree-invisible file (the same "unresolvable reference → error, never fabricate"
    // invariant resolveThreadFolder enforces for doc-creates).
    let chatsDir: string;
    let scopeId: string;
    if (input.weaveSlug === 'refs') {
        chatsDir = path.join(deps.loomRoot, 'loom', 'refs', 'chats');
        scopeId = 'refs';
    } else if (input.weaveSlug && input.threadUlid) {
        const { threadSlug, threadPath } = await resolveThreadFolder(input.weaveSlug, input.threadUlid, {
            getActiveLoomRoot: () => deps.loomRoot, loadDoc: deps.loadDoc, fs: deps.fs,
        });
        chatsDir = path.join(threadPath, 'chats');
        scopeId = threadSlug;
    } else {
        throw new Error(
            `Cannot create chat: a chat lives only in a thread ({weave}/{thread}/chats) ` +
            `or in refs (refs/chats). Got weaveSlug='${input.weaveSlug ?? ''}' with no ` +
            `resolvable thread — pass the thread's th_ ULID as threadUlid, or target refs. ` +
            `A weave-root chat (loom/{weave}/chats) is not a valid location.`,
        );
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
