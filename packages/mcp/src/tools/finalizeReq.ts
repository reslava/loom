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
            weaveId: { type: 'string', description: 'Target weave id' },
            threadId: { type: 'string', description: 'Thread id inside the weave' },
        },
        required: ['weaveId', 'threadId'],
    },
};

export async function handle(root: string, args: Record<string, unknown>) {
    const result = await finalizeReq(
        {
            weaveId: args['weaveId'] as string,
            threadId: args['threadId'] as string,
        },
        { getActiveLoomRoot: () => getActiveLoomRoot(root), saveDoc, loadDoc, fs },
    );
    return { content: [{ type: 'text' as const, text: JSON.stringify(result) }] };
}
