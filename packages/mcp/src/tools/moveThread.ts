import * as fs from 'fs-extra';
import { getActiveLoomRoot, loadDoc } from '../../../fs/dist';
import { moveThread } from '../../../app/dist/thread';

export const toolDef = {
    name: 'loom_move_thread',
    description: "Move a thread's folder to another weave. The thread is identified by its stable th_ ULID (thread_ulid), resolved in the source weave; its ULID travels with it, so depends_on edges survive and docs keep their ULIDs. Refuses if the destination weave is missing or already has a thread with that folder slug. Use this tool — do not move thread folders directly.",
    inputSchema: {
        type: 'object' as const,
        properties: {
            from_weave_slug: { type: 'string', description: 'Source weave folder slug.' },
            thread_ulid: { type: 'string', description: 'Stable th_ ULID of the thread to move.' },
            to_weave_slug: { type: 'string', description: 'Destination weave folder slug (must already exist).' },
        },
        required: ['from_weave_slug', 'thread_ulid', 'to_weave_slug'],
    },
};

export async function handle(root: string, args: Record<string, unknown>) {
    const result = await moveThread(
        { fromWeaveSlug: args['from_weave_slug'] as string, threadUlid: args['thread_ulid'] as string, toWeaveSlug: args['to_weave_slug'] as string },
        { getActiveLoomRoot: () => getActiveLoomRoot(root), loadDoc, fs },
    );
    return { content: [{ type: 'text' as const, text: JSON.stringify(result) }] };
}
