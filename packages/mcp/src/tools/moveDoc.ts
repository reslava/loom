import * as fs from 'fs-extra';
import { getActiveLoomRoot, loadDoc, buildLinkIndex, resolveDocIdOrThrow } from '../../../fs/dist';
import { moveDoc } from '../../../app/dist/moveDoc';

export const toolDef = {
    name: 'loom_move_doc',
    description: "Move a LOOSE FIBER to another thread. A loose fiber is a doc with no parent AND no children (a graph position, not a location) — in practice a standalone idea/design or a chat. Hard-refuses (never auto-detaches) if the doc has a parent_id or any children, isn't a movable type, or the destination's idea/design singleton slot is taken. Move a whole thread to relocate a developed chain. Use this tool — do not move doc files directly.",
    inputSchema: {
        type: 'object' as const,
        properties: {
            id: { type: 'string', description: 'Doc id (ULID or filename stem).' },
            toWeaveId: { type: 'string', description: 'Destination weave id.' },
            toThreadId: { type: 'string', description: 'Destination thread id (must already exist).' },
        },
        required: ['id', 'toWeaveId', 'toThreadId'],
    },
};

export async function handle(root: string, args: Record<string, unknown>) {
    const result = await moveDoc(
        { id: args['id'] as string, toWeaveId: args['toWeaveId'] as string, toThreadId: args['toThreadId'] as string },
        { getActiveLoomRoot: () => getActiveLoomRoot(root), fs, loadDoc, buildLinkIndex, resolveDocIdOrThrow },
    );
    return { content: [{ type: 'text' as const, text: JSON.stringify(result) }] };
}
