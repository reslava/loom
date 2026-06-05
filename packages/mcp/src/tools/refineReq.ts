import * as fs from 'fs-extra';
import { getActiveLoomRoot, saveDoc, loadDoc } from '../../../fs/dist';
import { refineReq } from '../../../app/dist/req';

export const toolDef = {
    name: 'loom_refine_req',
    description:
        "Update a thread's req doc and re-open it for curation: replaces the body (when `content` is given), sets status back to \"draft\", and bumps the version. A version bump marks downstream idea/design/plan stale (the re-open path for a locked spec that genuinely needs to change). Use this tool to edit an existing req — do not edit weave files directly.",
    inputSchema: {
        type: 'object' as const,
        properties: {
            weaveId: { type: 'string', description: 'Target weave id' },
            threadId: { type: 'string', description: 'Thread id inside the weave' },
            content: { type: 'string', description: 'New markdown body. Omit to leave the body unchanged (a pure re-open).' },
        },
        required: ['weaveId', 'threadId'],
    },
};

export async function handle(root: string, args: Record<string, unknown>) {
    const result = await refineReq(
        {
            weaveId: args['weaveId'] as string,
            threadId: args['threadId'] as string,
            content: args['content'] as string | undefined,
        },
        { getActiveLoomRoot: () => getActiveLoomRoot(root), saveDoc, loadDoc, fs },
    );
    return { content: [{ type: 'text' as const, text: JSON.stringify(result) }] };
}
