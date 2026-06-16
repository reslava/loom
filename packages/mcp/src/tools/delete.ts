import * as fs from 'fs-extra';
import { resolveDocIdOrThrow } from '../../../fs/dist';
import { removeItem, RemoveInput } from '../../../app/dist/remove';

export const toolDef = {
    name: 'loom_delete',
    description:
        "Permanently delete a Loom doc by id, or an entire thread/weave folder by { weaveId, threadId? }. Destructive and irreversible — prefer loom_archive for recoverable removal. Pass exactly one of: id, or weaveId (+ optional threadId). Use this tool — do not delete files directly.",
    inputSchema: {
        type: 'object' as const,
        properties: {
            id: { type: 'string', description: 'Document id to delete (mutually exclusive with weaveId)' },
            weaveId: { type: 'string', description: 'Weave to delete (whole folder), or the weave of the thread to delete' },
            threadId: { type: 'string', description: 'Thread to delete (requires weaveId)' },
        },
        required: [],
    },
};

export async function handle(root: string, args: Record<string, unknown>) {
    const id = args['id'] as string | undefined;
    const weaveId = args['weaveId'] as string | undefined;
    const threadId = args['threadId'] as string | undefined;

    const input: RemoveInput = id
        ? { id }
        : { weaveId: weaveId as string, threadId };

    const result = await removeItem(input, {
        getActiveLoomRoot: () => root,
        resolveDocIdOrThrow,
        fs,
    });
    return { content: [{ type: 'text' as const, text: JSON.stringify(result) }] };
}
