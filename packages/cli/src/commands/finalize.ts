import chalk from 'chalk';
import * as fs from 'fs-extra';
import * as path from 'path';
import { loadDoc } from '../../../fs/dist/load';
import { saveDoc } from '../../../fs/dist/save';
import { getActiveLoomRoot } from '../../../fs/dist/utils';
import { generatePermanentId } from '../../../core/dist/idUtils';
import { Document } from '../../../core/dist/types';

export async function finalizeCommand(tempId: string): Promise<void> {
    const loomRoot = getActiveLoomRoot();
    const threadsDir = path.join(loomRoot, 'threads');

    // 1. Find the document with the given temporary ID
    const docPath = await findDocumentByTempId(threadsDir, tempId);
    if (!docPath) {
        console.error(chalk.red(`❌ Document with temporary ID '${tempId}' not found.`));
        process.exit(1);
    }

    // 2. Load the document
    const doc = await loadDoc(docPath) as Document;
    
    // 3. Validate it can be finalized
    if (doc.status !== 'draft') {
        console.error(chalk.red(`❌ Only draft documents can be finalized. Current status: ${doc.status}`));
        process.exit(1);
    }

    // 4. Gather all existing IDs in the loom for uniqueness check
    const existingIds = await gatherAllDocumentIds(threadsDir);

    // 5. Generate the permanent ID from the document's title
    const permanentId = generatePermanentId(doc.title, doc.type, existingIds);

    // 6. Update the document
    const updatedDoc = {
        ...doc,
        id: permanentId,
        status: 'active' as const,
        updated: new Date().toISOString().split('T')[0],
    } as Document;

    // 7. Determine new file path
    const threadPath = path.dirname(docPath);
    const newPath = path.join(threadPath, `${permanentId}.md`);

    // 8. Save the updated document to the new path
    await saveDoc(updatedDoc, newPath);

    // 9. Remove the old file
    await fs.remove(docPath);

    console.log(chalk.green(`✅ Document finalized.`));
    console.log(chalk.gray(`   Old ID: ${tempId}`));
    console.log(chalk.green(`   New ID: ${permanentId}`));
    console.log(chalk.gray(`   Path: ${newPath}`));
}

/**
 * Recursively searches for a document with the given temporary ID.
 */
async function findDocumentByTempId(dir: string, tempId: string): Promise<string | null> {
    const entries = await fs.readdir(dir, { withFileTypes: true });
    for (const entry of entries) {
        const fullPath = path.join(dir, entry.name);
        if (entry.isDirectory() && entry.name !== '_archive') {
            const found = await findDocumentByTempId(fullPath, tempId);
            if (found) return found;
        } else if (entry.isFile() && entry.name === `${tempId}.md`) {
            return fullPath;
        }
    }
    return null;
}

/**
 * Gathers all document IDs from the entire loom for uniqueness checking.
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