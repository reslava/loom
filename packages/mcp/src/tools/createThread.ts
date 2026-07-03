import * as fs from 'fs-extra';
import { getActiveLoomRoot, saveDoc } from '../../../fs/dist';
import { createThread } from '../../../app/dist/thread';

export const toolDef = {
    name: 'loom_create_thread',
    description:
        "Create a thread's manifest (`thread.md`) — the authored roadmap metadata: a stable `th_` ULID identity, a soft `priority`, and hard `depends_on` edges (other threads' `th_` ULIDs). One flat `thread.md` per thread, like `req.md`. This is the FIRST step for any new thread: it mints the `th_` ULID that `loom_create_idea`/`_design`/`_plan`/`_req` then reference via `thread_ulid` (doc-create never fabricates a thread). Returns `{ id }` — the new thread's `th_` ULID. Use this tool — do not edit weave files directly.",
    inputSchema: {
        type: 'object' as const,
        properties: {
            weave_slug: { type: 'string', description: 'Target weave folder slug' },
            thread_slug: { type: 'string', description: 'New thread folder slug (a human slug — the th_ ULID identity is minted for you)' },
            title: { type: 'string', description: 'Optional title (defaults to the thread_slug)' },
            priority: { type: 'number', description: 'Optional soft priority (lower = earlier among dependency-free slack; default 1000)' },
            depends_on: { type: 'array', items: { type: 'string' }, description: 'Optional th_ ULIDs this thread depends on' },
        },
        required: ['weave_slug', 'thread_slug'],
    },
};

export async function handle(root: string, args: Record<string, unknown>) {
    const result = await createThread(
        {
            weaveSlug: args['weave_slug'] as string,
            threadSlug: args['thread_slug'] as string,
            title: args['title'] as string | undefined,
            priority: args['priority'] as number | undefined,
            dependsOn: args['depends_on'] as string[] | undefined,
        },
        { getActiveLoomRoot: () => getActiveLoomRoot(root), saveDoc, fs },
    );
    return { content: [{ type: 'text' as const, text: JSON.stringify(result) }] };
}
