import { Document, decideSetStatus } from '../../core/dist';
import { loadDoc, saveDoc, getActiveLoomRoot, findDocumentById } from '../../fs/dist';

export interface SetStatusInput {
    docUlid: string;
    status: string;
}

export interface SetStatusDeps {
    loadDoc: typeof loadDoc;
    saveDoc: typeof saveDoc;
    getActiveLoomRoot: typeof getActiveLoomRoot;
    findDocumentById: typeof findDocumentById;
}

/**
 * The single status verb. Flips a plain doc's lifecycle status (draft/active/done/…)
 * with NO version/`updated` bump — a status change is a lifecycle event, not a spec
 * revision, so it must not cascade false staleness to children (see
 * loom/refs/staleness-reference.md).
 *
 * Guarded transitions a dedicated tool owns (plan→implementing/done, req→locked) are
 * refused with a pointer to that tool; a status invalid for the type is rejected. The
 * decision is delegated to the pure `decideSetStatus` in core.
 */
export async function setStatus(
    input: SetStatusInput,
    deps: SetStatusDeps
): Promise<{ id: string; status: string; filePath: string }> {
    const loomRoot = deps.getActiveLoomRoot();

    const docPath = await deps.findDocumentById(loomRoot, input.docUlid);
    if (!docPath) {
        throw new Error(`Document with ID '${input.docUlid}' not found.`);
    }

    const doc = await deps.loadDoc(docPath) as Document;

    const decision = decideSetStatus(doc.type, input.status);
    if (decision.kind === 'delegate') {
        throw new Error(
            `Refusing to set a ${doc.type} to '${input.status}' via set-status — use ${decision.tool} (${decision.reason}).`
        );
    }
    if (decision.kind === 'reject') {
        throw new Error(decision.reason);
    }

    // Idempotent no-op if already at the target status.
    if (doc.status === input.status) {
        return { id: doc.id, status: input.status, filePath: docPath };
    }

    const updated = { ...doc, status: input.status } as Document;
    await deps.saveDoc(updated, docPath);

    return { id: doc.id, status: input.status, filePath: docPath };
}
