import { findDocumentById, loadDoc, saveDoc } from '../../../fs/dist';
import { Document } from '../../../core/dist';

export const toolDef = {
    name: 'loom_update_doc',
    description: 'Replace the markdown body of an existing document, preserving frontmatter and incrementing version. Use this tool to update Loom docs — do not edit weave files directly.',
    inputSchema: {
        type: 'object' as const,
        properties: {
            id: { type: 'string', description: 'Document id to update' },
            content: { type: 'string', description: 'New markdown body (no frontmatter — frontmatter is preserved automatically)' },
        },
        required: ['id', 'content'],
    },
};

export async function handle(root: string, args: Record<string, unknown>) {
    const id = args['id'] as string;
    const newContent = args['content'] as string;

    const filePath = await findDocumentById(root, id);
    if (!filePath) {
        throw new Error(`Document not found: ${id}`);
    }

    const doc = await loadDoc(filePath) as Document;
    const updated: Document = {
        ...doc,
        version: doc.version + 1,
        updated: new Date().toISOString().split('T')[0],
        content: newContent,
    } as Document;

    await saveDoc(updated, filePath);
    return { content: [{ type: 'text' as const, text: JSON.stringify({ id, filePath }) }] };
}
