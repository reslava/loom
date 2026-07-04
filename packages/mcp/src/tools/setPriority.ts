import * as fs from 'fs-extra';
import { getActiveLoomRoot, saveDoc, loadDoc } from '../../../fs/dist';
import { setThreadPriority } from '../../../app/dist/thread';

export const toolDef = {
    name: 'loom_set_priority',
    description:
        "Set a thread's soft `priority` on its `thread.md` (the drag-reorder write). Lower = earlier among the slack the dependency graph leaves free; it never overrides a hard `depends_on` edge. Identifies the thread by its `th_` ULID. Use this tool — do not edit weave files directly.",
    inputSchema: {
        type: 'object' as const,
        properties: {
            thread_ulid: { type: 'string', description: "The thread's th_ ULID (its thread.md id)" },
            priority: { type: 'number', description: 'New soft priority (lower = earlier)' },
        },
        required: ['thread_ulid', 'priority'],
    },
};

export async function handle(root: string, args: Record<string, unknown>) {
    const result = await setThreadPriority(
        { threadUlid: args['thread_ulid'] as string, priority: args['priority'] as number },
        { getActiveLoomRoot: () => getActiveLoomRoot(root), saveDoc, loadDoc, fs },
    );
    return { content: [{ type: 'text' as const, text: JSON.stringify(result) }] };
}
