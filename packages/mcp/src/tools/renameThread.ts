import * as fs from 'fs-extra';
import { getActiveLoomRoot, loadDoc } from '../../../fs/dist';
import { renameThread } from '../../../app/dist/thread';

export const toolDef = {
    name: 'loom_rename_thread',
    description: "Rename a thread's folder slug. The thread is identified by its stable th_ ULID (thread_ulid); its identity and all its docs are untouched, so depends_on edges and every backlink survive. (Legacy thread-prefixed idea/design filenames are flattened to idea.md/design.md so the rename holds pre-migration.) Use this tool — do not rename thread folders directly.",
    inputSchema: {
        type: 'object' as const,
        properties: {
            weave_slug: { type: 'string', description: 'Weave folder slug that contains the thread.' },
            thread_ulid: { type: 'string', description: 'Stable th_ ULID of the thread to rename.' },
            new_thread_slug: { type: 'string', description: 'New thread folder slug.' },
        },
        required: ['weave_slug', 'thread_ulid', 'new_thread_slug'],
    },
};

export async function handle(root: string, args: Record<string, unknown>) {
    const result = await renameThread(
        { weaveSlug: args['weave_slug'] as string, threadUlid: args['thread_ulid'] as string, newThreadSlug: args['new_thread_slug'] as string },
        { getActiveLoomRoot: () => getActiveLoomRoot(root), loadDoc, fs },
    );
    return { content: [{ type: 'text' as const, text: JSON.stringify(result) }] };
}
