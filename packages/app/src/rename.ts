import { loadDoc, saveDoc, getActiveLoomRoot, findDocumentById, gatherAllDocumentIds, findMarkdownFiles } from '../../fs/dist';
import { generatePermanentId } from '../../core/dist/idUtils';
import { Document, PlanDoc } from '../../core/dist/types';
import * as fs from 'fs-extra';
import * as path from 'path';

export interface RenameInput {
    oldId: string;
    newTitle: string;
}

export interface RenameDeps {
    loadDoc: typeof loadDoc;
    saveDoc: typeof saveDoc;
    getActiveLoomRoot: typeof getActiveLoomRoot;
    findDocumentById: typeof findDocumentById;
    gatherAllDocumentIds: typeof gatherAllDocumentIds;
    findMarkdownFiles: typeof findMarkdownFiles;
    fs: typeof fs;
}

async function updateAllReferences(
    loomRoot: string,
    oldId: string,
    newId: string,
    deps: Pick<RenameDeps, 'loadDoc' | 'saveDoc' | 'findMarkdownFiles'>
): Promise<number> {
    const files = await deps.findMarkdownFiles(loomRoot);
    let updatedCount = 0;

    for (const file of files) {
        const doc = await deps.loadDoc(file) as Document;
        let modified = false;

        // Update parent_id
        if (doc.parent_id === oldId) {
            doc.parent_id = newId;
            modified = true;
        }

        // Update child_ids array
        if (doc.child_ids && doc.child_ids.includes(oldId)) {
            doc.child_ids = doc.child_ids.map(id => id === oldId ? newId : id);
            modified = true;
        }

        // Update Blocked by column in plan steps
        if (doc.type === 'plan') {
            const planDoc = doc as PlanDoc;
            let stepsModified = false;
            const updatedSteps = planDoc.steps?.map(step => {
                if (step.blockedBy && step.blockedBy.includes(oldId)) {
                    stepsModified = true;
                    return {
                        ...step,
                        blockedBy: step.blockedBy.map(id => id === oldId ? newId : id),
                    };
                }
                return step;
            });
            if (stepsModified) {
                planDoc.steps = updatedSteps;
                modified = true;
            }
        }

        if (modified) {
            await deps.saveDoc(doc, file);
            updatedCount++;
        }
    }

    return updatedCount;
}

export async function rename(
    input: RenameInput,
    deps: RenameDeps
): Promise<{ oldId: string; newId: string; updatedCount: number }> {
    const loomRoot = deps.getActiveLoomRoot();

    const docPath = await deps.findDocumentById(loomRoot, input.oldId);
    if (!docPath) {
        throw new Error(`Document with ID '${input.oldId}' not found.`);
    }

    const doc = await deps.loadDoc(docPath) as Document;

    if (doc.status === 'draft') {
        throw new Error(`Draft documents cannot be renamed. Use 'loom finalize' first.`);
    }

    const allIds = await deps.gatherAllDocumentIds(loomRoot);
    allIds.delete(input.oldId);

    const newId = generatePermanentId(input.newTitle, doc.type, allIds);

    const updatedCount = await updateAllReferences(loomRoot, input.oldId, newId, {
        loadDoc: deps.loadDoc,
        saveDoc: deps.saveDoc,
        findMarkdownFiles: deps.findMarkdownFiles,
    });

    const updatedDoc = {
        ...doc,
        id: newId,
        title: input.newTitle,
        updated: new Date().toISOString().split('T')[0],
    } as Document;

    const threadPath = path.dirname(docPath);
    const newPath = path.join(threadPath, `${newId}.md`);

    await deps.saveDoc(updatedDoc, newPath);
    await deps.fs.remove(docPath);

    return { oldId: input.oldId, newId, updatedCount };
}