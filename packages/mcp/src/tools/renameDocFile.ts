import * as fs from 'fs-extra';
import { getActiveLoomRoot, loadDoc, saveDoc, resolveDocIdOrThrow } from '../../../fs/dist';
import { renameDocFile } from '../../../app/dist/renameDocFile';

export const toolDef = {
    name: 'loom_rename_doc_file',
    description: "Rename a REFERENCE doc's filename slug ({slug}.md). References are the one doc type whose filename is a human slug, so they're the one type where a filename rename is meaningful — idea/design/plan/chat filenames are machine-owned (use loom_rename to change a title). Updates the filename and the slug frontmatter in lockstep; the ULID id and backlinks are untouched. Refuses non-reference docs. Use this tool — do not rename doc files directly.",
    inputSchema: {
        type: 'object' as const,
        properties: {
            id: { type: 'string', description: 'Reference doc id (ULID or slug).' },
            newSlug: { type: 'string', description: 'New filename slug (kebab-cased; no .md).' },
        },
        required: ['id', 'newSlug'],
    },
};

export async function handle(root: string, args: Record<string, unknown>) {
    const result = await renameDocFile(
        { id: args['id'] as string, newSlug: args['newSlug'] as string },
        { getActiveLoomRoot: () => getActiveLoomRoot(root), fs, loadDoc, saveDoc, resolveDocIdOrThrow },
    );
    return { content: [{ type: 'text' as const, text: JSON.stringify(result) }] };
}
