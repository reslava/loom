import * as fs from 'fs-extra';
import { getActiveLoomRoot } from '../../../fs/dist';
import { moveThread } from '../../../app/dist/thread';

export const toolDef = {
    name: 'loom_move_thread',
    description: "Move a thread folder to another weave (loom/{fromWeaveId}/{threadId} → loom/{toWeaveId}/{threadId}). The thread's th_ ULID travels with it, so depends_on edges survive; docs keep their ULIDs. Refuses if the destination weave is missing or already has a thread with that id. Use this tool — do not move thread folders directly.",
    inputSchema: {
        type: 'object' as const,
        properties: {
            fromWeaveId: { type: 'string', description: 'Source weave id.' },
            threadId: { type: 'string', description: 'Thread id (folder name) to move.' },
            toWeaveId: { type: 'string', description: 'Destination weave id (must already exist).' },
        },
        required: ['fromWeaveId', 'threadId', 'toWeaveId'],
    },
};

export async function handle(root: string, args: Record<string, unknown>) {
    const result = await moveThread(
        { fromWeaveId: args['fromWeaveId'] as string, threadId: args['threadId'] as string, toWeaveId: args['toWeaveId'] as string },
        { getActiveLoomRoot: () => getActiveLoomRoot(root), fs },
    );
    return { content: [{ type: 'text' as const, text: JSON.stringify(result) }] };
}
