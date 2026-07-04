import * as fs from 'fs-extra';
import { getActiveLoomRoot, loadDoc, saveDoc, resolveDocIdOrThrow } from '../../../fs/dist';
import { renameDocFile } from '../../../app/dist/renameDocFile';

export const toolDef = {
    name: 'loom_rename_reference_file',
    description: "Rename a REFERENCE doc's filename slug ({slug}.md). References are the one doc type whose filename is a human slug, so they're the one type where a filename rename is meaningful — idea/design/plan/chat filenames are machine-owned (use loom_retitle to change a title). Updates the filename and the slug frontmatter in lockstep; the ULID id and backlinks are untouched. Refuses non-reference docs. (Renamed from loom_rename_doc_file — it only acts on references.) Use this tool — do not rename doc files directly.",
    inputSchema: {
        type: 'object' as const,
        properties: {
            doc_ulid: { type: 'string', description: 'Reference doc ULID (a reference slug is also resolved).' },
            new_slug: { type: 'string', description: 'New filename slug (kebab-cased; no .md).' },
        },
        required: ['doc_ulid', 'new_slug'],
    },
};

export async function handle(root: string, args: Record<string, unknown>) {
    const result = await renameDocFile(
        { id: args['doc_ulid'] as string, newSlug: args['new_slug'] as string },
        { getActiveLoomRoot: () => getActiveLoomRoot(root), fs, loadDoc, saveDoc, resolveDocIdOrThrow },
    );
    return { content: [{ type: 'text' as const, text: JSON.stringify(result) }] };
}
