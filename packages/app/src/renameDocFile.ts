import * as path from 'path';
import * as fsExtra from 'fs-extra';
import { loadDoc, saveDoc, resolveDocIdOrThrow } from '../../fs/dist';
import { toKebabCaseId, stripTrailingTypeWord, today } from '../../core/dist';

/**
 * Rename a REFERENCE doc's filename slug. References are the one doc type whose
 * filename IS a human slug (`{slug}.md`), so they're the one type where a filename
 * rename is meaningful (idea/design/plan/chat filenames are machine-owned). Updates
 * both the on-disk filename and the `slug` frontmatter field so they stay in sync;
 * the ULID id and every backlink are untouched. Refuses non-reference docs.
 */

export interface RenameDocFileInput {
    id: string;
    newSlug: string;
}

export interface RenameDocFileDeps {
    getActiveLoomRoot: () => string;
    fs: typeof fsExtra;
    loadDoc: typeof loadDoc;
    saveDoc: typeof saveDoc;
    resolveDocIdOrThrow: typeof resolveDocIdOrThrow;
}

export async function renameDocFile(
    input: RenameDocFileInput,
    deps: RenameDocFileDeps,
): Promise<{ id: string; from: string; to: string }> {
    const loomRoot = deps.getActiveLoomRoot();
    const { id, filePath } = await deps.resolveDocIdOrThrow(loomRoot, input.id);

    const doc = await deps.loadDoc(filePath) as { type?: string; slug?: string };
    if (doc.type !== 'reference') {
        throw new Error(`loom_rename_doc_file only renames reference docs (their filename is a slug). '${id}' is a '${doc.type}' — its filename is machine-owned; use loom_rename to change the title.`);
    }

    // Match the create convention: filename is {slug}-reference.md and the `slug`
    // frontmatter holds the BARE slug (a trailing "reference" word is stripped so a
    // slug like "api-reference" doesn't yield api-reference-reference.md).
    const slug = stripTrailingTypeWord(toKebabCaseId(input.newSlug), 'reference');
    if (!slug) throw new Error(`Invalid slug '${input.newSlug}'.`);
    const destName = `${slug}-reference.md`;

    const dir = path.dirname(filePath);
    const destPath = path.join(dir, destName);
    if (path.resolve(destPath) === path.resolve(filePath)) {
        return { id, from: path.basename(filePath), to: destName };
    }
    if (await deps.fs.pathExists(destPath)) {
        throw new Error(`A reference '${destName}' already exists in ${path.relative(loomRoot, dir)}.`);
    }

    // Keep the slug frontmatter field in lockstep with the filename, then relocate.
    const updated = { ...(doc as object), slug, updated: today() };
    await deps.saveDoc(updated as any, destPath);
    if (path.resolve(destPath) !== path.resolve(filePath)) {
        await deps.fs.remove(filePath);
    }
    return { id, from: path.basename(filePath), to: destName };
}
