import * as fs from 'fs-extra';
import { loadDoc, saveDoc, getActiveLoomRoot, findDocumentById, gatherAllDocumentIds, findMarkdownFiles } from '../../../fs/dist';
import { rename as renameUseCase } from '../../../app/dist/rename';

export const toolDef = {
    name: 'loom_rename',
    description: 'Rename a document: updates its title, assigns a new id, renames the file, and updates all references in the workspace. Use this tool to rename Loom docs — do not edit files directly.',
    inputSchema: {
        type: 'object' as const,
        properties: {
            oldId: { type: 'string', description: 'Current document id' },
            newTitle: { type: 'string', description: 'New human-readable title (id is derived from this)' },
        },
        required: ['oldId', 'newTitle'],
    },
};

export async function handle(root: string, args: Record<string, unknown>) {
    const result = await renameUseCase(
        { oldId: args['oldId'] as string, newTitle: args['newTitle'] as string },
        {
            loadDoc,
            saveDoc,
            getActiveLoomRoot: () => getActiveLoomRoot(root),
            findDocumentById,
            gatherAllDocumentIds,
            findMarkdownFiles,
            fs,
        }
    );

    return { content: [{ type: 'text' as const, text: JSON.stringify(result) }] };
}
