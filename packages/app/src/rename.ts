import { Document, syncBodyH1, today } from '../../core/dist';
import { loadDoc, saveDoc, getActiveLoomRoot, findDocumentById } from '../../fs/dist';

export interface RenameInput {
    oldId: string;
    newTitle: string;
}

export interface RenameDeps {
    loadDoc: typeof loadDoc;
    saveDoc: typeof saveDoc;
    getActiveLoomRoot: typeof getActiveLoomRoot;
    findDocumentById: typeof findDocumentById;
}

/**
 * Renames a document = changes its human-facing **title** only.
 *
 * The permanent `id` (a content-independent ULID, e.g. `ch_01J…`) and the filename
 * are deliberately left untouched. Identity must not be re-derived from a mutable
 * title: backlinks (`parent_id`, `requires_load`, plan `blockedBy`) all reference
 * the id, and the tree view displays `title`, so a title change is fully reflected
 * without moving the file or rewriting a single reference. With the id fixed there
 * is nothing to update across the workspace — which is also why this no longer walks
 * every doc under `loom/` (that scan was what crashed on the frontmatter-free
 * `loom/refs/CLAUDE-reference.md`).
 *
 * Frontmatter title is the single source of truth; the body `# H1` is synced to match
 * (same contract as create/refine).
 */
export async function rename(
    input: RenameInput,
    deps: RenameDeps
): Promise<{ id: string; title: string }> {
    const loomRoot = deps.getActiveLoomRoot();

    const docPath = await deps.findDocumentById(loomRoot, input.oldId);
    if (!docPath) {
        throw new Error(`Document with ID '${input.oldId}' not found.`);
    }

    const doc = await deps.loadDoc(docPath) as Document;

    if (doc.status === 'draft') {
        throw new Error(`Draft documents cannot be renamed. Use 'loom finalize' first.`);
    }

    const updatedDoc = {
        ...doc,
        title: input.newTitle,
        content: syncBodyH1((doc as { content?: string }).content ?? '', input.newTitle),
        updated: today(),
    } as Document;

    await deps.saveDoc(updatedDoc, docPath);

    return { id: doc.id, title: input.newTitle };
}
