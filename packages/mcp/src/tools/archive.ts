import * as path from 'path';
import * as fs from 'fs-extra';
import { resolveDocIdOrThrow } from '../../../fs/dist';

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

    // Primary (agent-supplied) id → suggest-on-miss.
    const { filePath } = await resolveDocIdOrThrow(root, id);

    // Archive convention: mirror the doc's path under a single top-level
    // loom/.archive/ tree (e.g. loom/core-engine/foo/plans/x.md →
    // loom/.archive/core-engine/foo/plans/x.md). Never an in-thread .archive/.
    // Mirrors the VS Code archiveItem command so both surfaces agree.
    const loomDir = path.join(root, 'loom') + path.sep;
    if (!filePath.startsWith(loomDir)) {
        throw new Error(`Cannot archive: ${filePath} is not inside loom/`);
    }
    const rel = filePath.slice(loomDir.length);
    const archivedPath = path.join(root, 'loom', '.archive', rel);
    await fs.ensureDir(path.dirname(archivedPath));
    await fs.move(filePath, archivedPath, { overwrite: false });

    return { content: [{ type: 'text' as const, text: JSON.stringify({ id, archivedPath }) }] };
}
