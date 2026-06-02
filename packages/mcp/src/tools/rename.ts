import { loadDoc, saveDoc, getActiveLoomRoot, findDocumentById, resolveDocIdOrThrow } from '../../../fs/dist';
import { rename as renameUseCase } from '../../../app/dist/rename';

export const toolDef = {
    name: 'loom_rename',
    description: "Rename a document: updates its title (and synced body H1) only. The permanent id and the filename are unchanged — identity is not derived from the title, so backlinks stay intact. Use this tool to rename Loom docs — do not edit files directly.",
    inputSchema: {
        type: 'object' as const,
        properties: {
            oldId: { type: 'string', description: 'Current document id' },
            newTitle: { type: 'string', description: 'New human-readable title (the id is NOT changed)' },
        },
        required: ['oldId', 'newTitle'],
    },
};

export async function handle(root: string, args: Record<string, unknown>) {
    // Resolve the agent-supplied oldId at the delivery boundary: gives suggest-on-miss
    // and converts a filename-stem to the canonical id so findDocumentById locates the doc.
    const { id: resolvedOldId } = await resolveDocIdOrThrow(root, args['oldId'] as string);

    const result = await renameUseCase(
        { oldId: resolvedOldId, newTitle: args['newTitle'] as string },
        {
            loadDoc,
            saveDoc,
            getActiveLoomRoot: () => getActiveLoomRoot(root),
            findDocumentById,
        }
    );

    return { content: [{ type: 'text' as const, text: JSON.stringify(result) }] };
}
