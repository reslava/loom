import * as fs from 'fs-extra';
import { getActiveLoomRoot } from '../../../fs/dist';
import { renameThread } from '../../../app/dist/thread';

export const toolDef = {
    name: 'loom_rename_thread',
    description: "Rename a thread folder (loom/{weaveId}/{threadId}) — the slug only. The thread's stable identity (th_ ULID in thread.md) and all its docs are untouched, so depends_on edges and every backlink survive. (Legacy thread-prefixed idea/design filenames are flattened to idea.md/design.md so the rename holds pre-migration.) Use this tool — do not rename thread folders directly.",
    inputSchema: {
        type: 'object' as const,
        properties: {
            weaveId: { type: 'string', description: 'Weave id that contains the thread.' },
            threadId: { type: 'string', description: 'Current thread id (folder name).' },
            newThreadId: { type: 'string', description: 'New thread id (folder name).' },
        },
        required: ['weaveId', 'threadId', 'newThreadId'],
    },
};

export async function handle(root: string, args: Record<string, unknown>) {
    const result = await renameThread(
        { weaveId: args['weaveId'] as string, threadId: args['threadId'] as string, newThreadId: args['newThreadId'] as string },
        { getActiveLoomRoot: () => getActiveLoomRoot(root), fs },
    );
    return { content: [{ type: 'text' as const, text: JSON.stringify(result) }] };
}
