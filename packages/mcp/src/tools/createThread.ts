import * as fs from 'fs-extra';
import { getActiveLoomRoot, saveDoc } from '../../../fs/dist';
import { createThread } from '../../../app/dist/thread';

export const toolDef = {
    name: 'loom_create_thread',
    description:
        "Create a thread's manifest (`thread.md`) — the authored roadmap metadata: a stable `th_` ULID identity, a soft `priority`, and hard `depends_on` edges (other threads' `th_` ULIDs). One flat `thread.md` per thread, like `req.md`. Lets an empty thread (no idea yet) appear on the roadmap and be depended upon. Threads created via `loom_create_idea`/`_design`/`_plan`/`_req` auto-scaffold their manifest already; use this for a brand-new empty thread. Use this tool — do not edit weave files directly.",
    inputSchema: {
        type: 'object' as const,
        properties: {
            weaveId: { type: 'string', description: 'Target weave id' },
            threadId: { type: 'string', description: 'Thread id (folder slug) inside the weave' },
            title: { type: 'string', description: 'Optional title (defaults to the threadId)' },
            priority: { type: 'number', description: 'Optional soft priority (lower = earlier among dependency-free slack; default 1000)' },
            dependsOn: { type: 'array', items: { type: 'string' }, description: 'Optional th_ ULIDs this thread depends on' },
        },
        required: ['weaveId', 'threadId'],
    },
};

export async function handle(root: string, args: Record<string, unknown>) {
    const result = await createThread(
        {
            weaveId: args['weaveId'] as string,
            threadId: args['threadId'] as string,
            title: args['title'] as string | undefined,
            priority: args['priority'] as number | undefined,
            dependsOn: args['dependsOn'] as string[] | undefined,
        },
        { getActiveLoomRoot: () => getActiveLoomRoot(root), saveDoc, fs },
    );
    return { content: [{ type: 'text' as const, text: JSON.stringify(result) }] };
}
