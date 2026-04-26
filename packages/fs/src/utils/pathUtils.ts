import * as fs from 'fs-extra';
import * as path from 'path';

const RESERVED_SUBDIR_NAMES = new Set(['plans', 'done', 'chats', 'ctx', 'refs', '.archive']);

/**
 * Returns thread subdirectory names within a weave folder.
 * A subdir qualifies as a thread if it is not reserved and contains an idea/design doc
 * or a non-empty plans/ subdir.
 */
export async function listThreadDirs(weavePath: string): Promise<string[]> {
    if (!await fs.pathExists(weavePath)) return [];
    const entries = await fs.readdir(weavePath, { withFileTypes: true });
    return entries
        .filter(e => e.isDirectory() && !RESERVED_SUBDIR_NAMES.has(e.name))
        .map(e => e.name);
}

/**
 * Recursively finds all Markdown files in a directory, excluding _archive.
 */
export async function findMarkdownFiles(dir: string): Promise<string[]> {
    const result: string[] = [];
    const entries = await fs.readdir(dir, { withFileTypes: true });
    
    for (const entry of entries) {
        const fullPath = path.join(dir, entry.name);
        if (entry.isDirectory() && entry.name !== '.archive') {
            result.push(...await findMarkdownFiles(fullPath));
        } else if (entry.isFile() && entry.name.endsWith('.md')) {
            result.push(fullPath);
        }
    }
    
    return result;
}

/**
 * Recursively searches for a document by its ID.
 * Returns the absolute file path if found, otherwise null.
 */
export async function findDocumentById(loomRoot: string, id: string): Promise<string | null> {
    const files = await findMarkdownFiles(loomRoot);
    const targetFile = `${id}.md`;
    
    for (const file of files) {
        if (path.basename(file) === targetFile) {
            return file;
        }
    }
    
    return null;
}

/**
 * Locates the thread directory for a given thread ID.
 * Returns the absolute path if found, otherwise null.
 */
export async function findThreadPath(loomRoot: string, weaveId: string): Promise<string | null> {
    const threadsDir = path.join(loomRoot, 'loom');
    const threadPath = path.join(threadsDir, weaveId);
    
    if (await fs.pathExists(threadPath)) {
        return threadPath;
    }
    
    return null;
}

/**
 * Gathers all document IDs from the entire loom.
 * Useful for uniqueness checks when generating new IDs.
 */
export async function gatherAllDocumentIds(loomRoot: string): Promise<Set<string>> {
    const ids = new Set<string>();
    const files = await findMarkdownFiles(loomRoot);
    
    for (const file of files) {
        const id = path.basename(file, '.md');
        ids.add(id);
    }
    
    return ids;
}