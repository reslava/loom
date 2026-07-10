import * as fs from 'fs-extra';
import * as path from 'path';
import * as yaml from 'yaml';

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

async function readFrontmatterId(filePath: string): Promise<string | null> {
    try {
        const content = await fs.readFile(filePath, 'utf-8');
        const match = content.match(/^---\r?\n([\s\S]*?)\r?\n---/);
        if (!match) return null;
        const fm = yaml.parse(match[1]);
        return typeof fm?.id === 'string' ? fm.id : null;
    } catch {
        return null;
    }
}

/**
 * Recursively searches for a document by its frontmatter `id` field.
 * Returns the absolute file path if found, otherwise null.
 */
export async function findDocumentById(loomRoot: string, id: string): Promise<string | null> {
    const files = await findMarkdownFiles(loomRoot);
    for (const file of files) {
        if (await readFrontmatterId(file) === id) return file;
    }
    return null;
}

/**
 * Locates the thread directory for a given thread ID.
 * Returns the absolute path if found, otherwise null.
 */
export async function findThreadPath(loomRoot: string, weaveSlug: string): Promise<string | null> {
    const threadsDir = path.join(loomRoot, 'loom');
    const threadPath = path.join(threadsDir, weaveSlug);
    
    if (await fs.pathExists(threadPath)) {
        return threadPath;
    }
    
    return null;
}

/**
 * Resolves the weave slug for a given plan by locating the plan file on disk.
 * Searches under {loomRoot}/loom/ and returns the first path component (the weave dir).
 * A plan is addressed by its ULID; the weave slug is recovered from the resolved
 * *path*, never by parsing the id.
 */
export async function resolveWeaveSlugForPlan(loomRoot: string, planUlid: string): Promise<string> {
    const loomDir = path.join(loomRoot, 'loom');
    const planPath = await findDocumentById(loomDir, planUlid);
    if (!planPath) {
        throw new Error(`Plan '${planUlid}' not found under ${loomDir}`);
    }
    const rel = path.relative(loomDir, planPath);
    const weaveSlug = rel.split(path.sep)[0];
    if (!weaveSlug) {
        throw new Error(`Could not derive weave slug from plan path: ${planPath}`);
    }
    return weaveSlug;
}

/**
 * Gathers all document IDs (from frontmatter) from the entire loom.
 * Useful for uniqueness checks when generating new IDs.
 */
export async function gatherAllDocumentIds(loomRoot: string): Promise<Set<string>> {
    const ids = new Set<string>();
    const files = await findMarkdownFiles(loomRoot);
    for (const file of files) {
        const id = await readFrontmatterId(file);
        if (id) ids.add(id);
    }
    return ids;
}