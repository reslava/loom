import { loadDoc, saveDoc, getActiveLoomRoot, findDocumentById, resolveDocIdOrThrow } from '../../../fs/dist';
import { rename as renameUseCase } from '../../../app/dist/rename';

export const toolDef = {
    name: 'loom_retitle',
    description: "Retitle a document: updates its title (and synced body H1) only. The permanent id and the filename are unchanged — identity is not derived from the title, so backlinks stay intact. (Renamed from loom_rename — it only ever changed the title.) Use this tool to retitle Loom docs — do not edit files directly.",
    inputSchema: {
        type: 'object' as const,
        properties: {
            doc_ulid: { type: 'string', description: "The document's ULID" },
            newTitle: { type: 'string', description: 'New human-readable title (the id is NOT changed)' },
        },
        required: ['doc_ulid', 'newTitle'],
    },
};

export async function handle(root: string, args: Record<string, unknown>) {
    // Resolve the agent-supplied doc_ulid at the delivery boundary: gives suggest-on-miss
    // (a stem/typo is rejected with the canonical id) so findDocumentById locates the doc.
    const { id: resolvedOldId } = await resolveDocIdOrThrow(root, args['doc_ulid'] as string);

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
