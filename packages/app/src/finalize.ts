import { loadDoc } from '../../fs/dist/load';
import { saveDoc } from '../../fs/dist/save';
import { getActiveLoomRoot } from '../../fs/dist/utils';
import { generatePermanentId } from '../../core/dist/idUtils';
import { Document } from '../../core/dist/types';
import { findDocumentById, gatherAllDocumentIds } from '../../fs/dist/pathUtils';
import * as fs from 'fs-extra';
import * as path from 'path';

export interface FinalizeInput {
    tempId: string;
}

export interface FinalizeDeps {
    loadDoc: typeof loadDoc;
    saveDoc: typeof saveDoc;
    getActiveLoomRoot: typeof getActiveLoomRoot;
    findDocumentById: typeof findDocumentById;
    gatherAllDocumentIds: typeof gatherAllDocumentIds;
    fs: typeof fs;
}

export async function finalize(
    input: FinalizeInput,
    deps: FinalizeDeps
): Promise<{ oldId: string; newId: string; newPath: string }> {
    const loomRoot = deps.getActiveLoomRoot();

    const docPath = await deps.findDocumentById(loomRoot, input.tempId);
    if (!docPath) {
        throw new Error(`Document with temporary ID '${input.tempId}' not found.`);
    }

    const doc = await deps.loadDoc(docPath) as Document;
    
    if (doc.status !== 'draft') {
        throw new Error(`Only draft documents can be finalized. Current status: ${doc.status}`);
    }

    const existingIds = await deps.gatherAllDocumentIds(loomRoot);
    const permanentId = generatePermanentId(doc.title, doc.type, existingIds);

    const updatedDoc = {
        ...doc,
        id: permanentId,
        status: 'active' as const,
        updated: new Date().toISOString().split('T')[0],
    } as Document;

    const threadPath = path.dirname(docPath);
    const newPath = path.join(threadPath, `${permanentId}.md`);

    await deps.saveDoc(updatedDoc, newPath);
    await deps.fs.remove(docPath);

    return { oldId: input.tempId, newId: permanentId, newPath };
}