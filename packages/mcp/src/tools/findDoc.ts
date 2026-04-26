import { findDocumentById } from '../../../fs/dist';

export const toolDef = {
    name: 'loom_find_doc',
    description: 'Resolve a document id to its absolute file path. Returns an error if the document is not found.',
    inputSchema: {
        type: 'object' as const,
        properties: {
            id: { type: 'string', description: 'Document id to look up' },
        },
        required: ['id'],
    },
};

export async function handle(root: string, args: Record<string, unknown>) {
    const id = args['id'] as string;
    const filePath = await findDocumentById(root, id);
    if (!filePath) {
        throw new Error(`Document not found: ${id}`);
    }
    return { content: [{ type: 'text' as const, text: JSON.stringify({ id, filePath }) }] };
}
