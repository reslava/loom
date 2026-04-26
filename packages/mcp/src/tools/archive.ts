import * as path from 'path';
import * as fs from 'fs-extra';
import { findDocumentById } from '../../../fs/dist';

export const toolDef = {
    name: 'loom_archive',
    description: 'Archive a document by moving it to the .archive/ directory at the same level. Use this tool to archive Loom docs — do not move files directly.',
    inputSchema: {
        type: 'object' as const,
        properties: {
            id: { type: 'string', description: 'Document id to archive' },
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

    const dir = path.dirname(filePath);
    const archiveDir = path.join(dir, '.archive');
    await fs.ensureDir(archiveDir);

    const fileName = path.basename(filePath);
    const archivedPath = path.join(archiveDir, fileName);
    await fs.move(filePath, archivedPath, { overwrite: false });

    return { content: [{ type: 'text' as const, text: JSON.stringify({ id, archivedPath }) }] };
}
