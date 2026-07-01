import * as path from 'path';
import * as fsExtra from 'fs-extra';
import { loadDoc, buildLinkIndex, resolveDocIdOrThrow } from '../../fs/dist';
import { LinkIndex } from '../../core/dist/linkIndex';
import { nextOrdinal, chatFileName, singletonFileName } from '../../core/dist';

/**
 * Move a LOOSE FIBER to another thread. A loose fiber is a doc with **no parent and
 * no children** — a graph position, not a location. In practice that's a standalone
 * idea/design (never chained) or a chat (chats sit outside the idea→design→plan chain).
 * A developed chain is never moved piecemeal — move the whole thread instead.
 *
 * Hard-refuses (never auto-detaches) when the doc has a parent_id or any children, or
 * when the destination's singleton slot (idea/design) is already taken. Identity is the
 * ULID, so the move rewrites no content — pure file relocation.
 */

export interface MoveDocInput {
    id: string;
    toWeaveId: string;
    toThreadId: string;
}

export interface MoveDocDeps {
    getActiveLoomRoot: () => string;
    fs: typeof fsExtra;
    loadDoc: typeof loadDoc;
    buildLinkIndex: typeof buildLinkIndex;
    resolveDocIdOrThrow: typeof resolveDocIdOrThrow;
}

const MOVABLE_TYPES = new Set(['idea', 'design', 'chat']);

export async function moveDoc(
    input: MoveDocInput,
    deps: MoveDocDeps,
): Promise<{ id: string; from: string; to: string }> {
    const loomRoot = deps.getActiveLoomRoot();
    const index: LinkIndex = await deps.buildLinkIndex(loomRoot);
    const { id, filePath } = await deps.resolveDocIdOrThrow(loomRoot, input.id, index);

    const doc = await deps.loadDoc(filePath) as { type?: string; parent_id?: string | null };
    const type = doc.type ?? '';

    // Loose-fiber guard — hard refuse, no auto-detach.
    if (doc.parent_id) {
        throw new Error(`Cannot move '${id}': it has a parent (${doc.parent_id}). Only a loose fiber (no parent, no children) moves between threads — move the whole thread to relocate a chain.`);
    }
    const children = index.children.get(id);
    if (children && children.size > 0) {
        throw new Error(`Cannot move '${id}': it has ${children.size} child doc(s). Only a loose fiber (no parent, no children) moves between threads — move the whole thread to relocate a chain.`);
    }
    if (!MOVABLE_TYPES.has(type)) {
        throw new Error(`Cannot move a '${type}' doc between threads — only a loose idea, design, or chat qualifies.`);
    }

    const toThreadDir = path.join(loomRoot, 'loom', input.toWeaveId, input.toThreadId);
    if (!(await deps.fs.pathExists(toThreadDir))) {
        throw new Error(`Destination thread '${input.toWeaveId}/${input.toThreadId}' does not exist.`);
    }

    // Destination path by type; singleton slots must be free (dual-read the legacy name too).
    let destPath: string;
    if (type === 'idea' || type === 'design') {
        const flat = singletonFileName(type);
        destPath = path.join(toThreadDir, flat);
        const legacy = path.join(toThreadDir, `${input.toThreadId}-${type}.md`);
        if ((await deps.fs.pathExists(destPath)) || (await deps.fs.pathExists(legacy))) {
            throw new Error(`Destination thread '${input.toWeaveId}/${input.toThreadId}' already has a ${type}. A thread holds at most one.`);
        }
    } else {
        // chat → chats/chat-NNN.md with a fresh thread-local ordinal
        const chatsDir = path.join(toThreadDir, 'chats');
        await deps.fs.ensureDir(chatsDir);
        const existing = await deps.fs.readdir(chatsDir).catch(() => [] as string[]);
        destPath = path.join(chatsDir, chatFileName(nextOrdinal(existing, 'chat')));
    }

    const rel = (p: string) => path.relative(loomRoot, p).split(path.sep).join('/');
    await deps.fs.move(filePath, destPath, { overwrite: false });
    return { id, from: rel(filePath), to: rel(destPath) };
}
