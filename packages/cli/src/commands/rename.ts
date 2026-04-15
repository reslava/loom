import chalk from 'chalk';
import * as fs from 'fs-extra';
import * as path from 'path';
import { loadDoc } from '../../../fs/dist/load';
import { saveDoc } from '../../../fs/dist/save';
import { getActiveLoomRoot } from '../../../fs/dist/utils';
import { generatePermanentId } from '../../../core/dist/idUtils';
import { Document, PlanDoc } from '../../../core/dist/types';

export async function renameCommand(oldId: string, newTitle: string): Promise<void> {
    const loomRoot = getActiveLoomRoot();
    const threadsDir = path.join(loomRoot, 'threads');

    // 1. Find the document with the given ID
    const docPath = await findDocumentById(threadsDir, oldId);
    if (!docPath) {
        console.error(chalk.red(`❌ Document with ID '${oldId}' not found.`));
        process.exit(1);
    }

    // 2. Load the document
    const doc = await loadDoc(docPath) as Document;

    // 3. Validate it can be renamed (only finalized documents)
    if (doc.status === 'draft') {
        console.error(chalk.red(`❌ Draft documents cannot be renamed. Use 'loom finalize' first.`));
        process.exit(1);
    }

    // 4. Gather all existing IDs for uniqueness check (excluding the current document)
    const allIds = await gatherAllDocumentIds(threadsDir);
    allIds.delete(oldId);

    // 5. Generate the new permanent ID from the new title
    const newId = generatePermanentId(newTitle, doc.type, allIds);

    // 6. Scan all documents and update references
    const updatedCount = await updateAllReferences(threadsDir, oldId, newId);

    // 7. Update the document itself
    const updatedDoc = {
        ...doc,
        id: newId,
        title: newTitle,
        updated: new Date().toISOString().split('T')[0],
    } as Document;

    // 8. Determine new file path
    const threadPath = path.dirname(docPath);
    const newPath = path.join(threadPath, `${newId}.md`);

    // 9. Save the updated document to the new path
    await saveDoc(updatedDoc, newPath);

    // 10. Remove the old file
    await fs.remove(docPath);

    console.log(chalk.green(`✅ Document renamed.`));
    console.log(chalk.gray(`   Old ID: ${oldId}`));
    console.log(chalk.green(`   New ID: ${newId}`));
    console.log(chalk.gray(`   Updated ${updatedCount} reference(s).`));
}

/**
 * Recursively searches for a document with the given ID.
 */
async function findDocumentById(dir: string, id: string): Promise<string | null> {
    const entries = await fs.readdir(dir, { withFileTypes: true });
    for (const entry of entries) {
        const fullPath = path.join(dir, entry.name);
        if (entry.isDirectory() && entry.name !== '_archive') {
            const found = await findDocumentById(fullPath, id);
            if (found) return found;
        } else if (entry.isFile() && entry.name === `${id}.md`) {
            return fullPath;
        }
    }
    return null;
}

/**
 * Gathers all document IDs from the entire loom.
 */
async function gatherAllDocumentIds(threadsDir: string): Promise<Set<string>> {
    const ids = new Set<string>();
    const files = await findMarkdownFiles(threadsDir);
    for (const file of files) {
        const id = path.basename(file, '.md');
        ids.add(id);
    }
    return ids;
}

/**
 * Scans all documents and updates references from oldId to newId.
 * Returns the number of documents updated.
 */
async function updateAllReferences(threadsDir: string, oldId: string, newId: string): Promise<number> {
    const files = await findMarkdownFiles(threadsDir);
    let updatedCount = 0;

    for (const file of files) {
        const doc = await loadDoc(file) as Document;
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
            await saveDoc(doc, file);
            updatedCount++;
        }
    }

    return updatedCount;
}

async function findMarkdownFiles(dir: string): Promise<string[]> {
    const result: string[] = [];
    const entries = await fs.readdir(dir, { withFileTypes: true });
    for (const entry of entries) {
        const fullPath = path.join(dir, entry.name);
        if (entry.isDirectory() && entry.name !== '_archive') {
            result.push(...await findMarkdownFiles(fullPath));
        } else if (entry.isFile() && entry.name.endsWith('.md')) {
            result.push(fullPath);
        }
    }
    return result;
}