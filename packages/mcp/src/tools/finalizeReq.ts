import * as fs from 'fs-extra';
import { getActiveLoomRoot, saveDoc, loadDoc } from '../../../fs/dist';
import { finalizeReq } from '../../../app/dist/req';

export const toolDef = {
    name: 'loom_finalize_req',
    description:
        "Lock a thread's req doc: flips status \"draft\" → \"locked\" (the explicit anchor downstream idea/design/plan build against). Does not bump the version. Idempotent if already locked. To change a locked req later, use loom_amend_req (which re-opens it to draft and bumps the version under append-only rules). Use this tool to lock a req — do not edit weave files directly.",
    inputSchema: {
        type: 'object' as const,
        properties: {
            weave_slug: { type: 'string', description: 'Target weave folder slug' },
            thread_ulid: { type: 'string', description: 'Stable th_ ULID of the thread inside the weave' },
        },
        required: ['weave_slug', 'thread_ulid'],
    },
};

export async function handle(root: string, args: Record<string, unknown>) {
    const result = await finalizeReq(
        {
            weaveSlug: args['weave_slug'] as string,
            threadUlid: args['thread_ulid'] as string,
        },
        { getActiveLoomRoot: () => getActiveLoomRoot(root), saveDoc, loadDoc, fs },
    );
    return { content: [{ type: 'text' as const, text: JSON.stringify(result) }] };
}
