import * as fs from 'fs-extra';
import { loadDoc, saveDoc, getActiveLoomRoot, findDocumentById, gatherAllDocumentIds } from '../../../fs/dist';
import { finalize } from '../../../app/dist/finalize';

export const toolDef = {
    name: 'loom_finalize_doc',
    description: 'Finalize a draft document: assigns a permanent id, sets status to "active", renames the file. Use this tool to finalize docs — do not edit weave files directly.',
    inputSchema: {
        type: 'object' as const,
        properties: {
            id: { type: 'string', description: 'Temporary (draft) document id to finalize' },
        },
        required: ['id'],
    },
};

export async function handle(root: string, args: Record<string, unknown>) {
    const id = args['id'] as string;

    const result = await finalize({ tempId: id }, {
        loadDoc,
        saveDoc,
        getActiveLoomRoot: () => getActiveLoomRoot(root),
        findDocumentById,
        gatherAllDocumentIds,
        fs,
    });

    return { content: [{ type: 'text' as const, text: JSON.stringify(result) }] };
}
