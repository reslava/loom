import * as fs from 'fs-extra';
import * as path from 'path';

/**
 * Recursively finds all Markdown files in a directory, excluding _archive.
 */
export async function findMarkdownFiles(dir: string): Promise<string[]> {
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
export async function findThreadPath(loomRoot: string, threadId: string): Promise<string | null> {
    const threadsDir = path.join(loomRoot, 'threads');
    const threadPath = path.join(threadsDir, threadId);
    
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