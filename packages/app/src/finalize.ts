import { Document, today } from '../../core/dist';
import { loadDoc, saveDoc, getActiveLoomRoot, findDocumentById } from '../../fs/dist';

export interface FinalizeInput {
    tempId: string;
}

export interface FinalizeDeps {
    loadDoc: typeof loadDoc;
    saveDoc: typeof saveDoc;
    getActiveLoomRoot: typeof getActiveLoomRoot;
    findDocumentById: typeof findDocumentById;
}

/**
 * Finalizes a draft document = flips `status` from draft to active.
 *
 * The `id` (a permanent ULID assigned at creation) and the filename (a human slug
 * assigned at creation, e.g. `payment-design.md` or `{thread}-idea.md`) are both
 * left untouched. Finalize used to re-mint the id from the title — that destroyed a
 * perfectly good permanent ULID, broke the threaded filename convention, and could
 * produce double-suffix ids; identity must never be re-derived from a mutable title.
 */
export async function finalize(
    input: FinalizeInput,
    deps: FinalizeDeps
): Promise<{ id: string; newPath: string }> {
    const loomRoot = deps.getActiveLoomRoot();

    const docPath = await deps.findDocumentById(loomRoot, input.tempId);
    if (!docPath) {
        throw new Error(`Document with ID '${input.tempId}' not found.`);
    }

    const doc = await deps.loadDoc(docPath) as Document;

    if (doc.status !== 'draft') {
        throw new Error(`Only draft documents can be finalized. Current status: ${doc.status}`);
    }

    const updatedDoc = {
        ...doc,
        status: 'active' as const,
        updated: today(),
    } as Document;

    await deps.saveDoc(updatedDoc, docPath);

    return { id: doc.id, newPath: docPath };
}
