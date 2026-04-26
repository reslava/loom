import * as fs from 'fs-extra';
import { findDocumentById, loadDoc } from '../../../fs/dist';

interface RefEntry {
    id: string;
    filePath: string;
    content: string;
}

async function fetchRefs(
    root: string,
    ids: string[],
    visited: Set<string>,
    results: RefEntry[]
): Promise<void> {
    for (const id of ids) {
        if (visited.has(id)) continue;
        visited.add(id);

        const filePath = await findDocumentById(root, id);
        if (!filePath) continue;

        const content = await fs.readFile(filePath, 'utf8');
        results.push({ id, filePath, content });

        const doc = await loadDoc(filePath);
        if (doc.requires_load?.length) {
            await fetchRefs(root, doc.requires_load, visited, results);
        }
    }
}

export async function handleRequiresLoadResource(root: string, uri: string) {
    const url = new URL(uri.replace('loom://', 'loom://host/'));
    const segments = url.pathname.replace(/^\//, '').split('/');
    // loom://requires-load/{id}  →  [requires-load, id]
    const id = segments.slice(1).join('/');

    if (!id) {
        throw new Error('loom://requires-load requires a document id: loom://requires-load/{id}');
    }

    const filePath = await findDocumentById(root, id);
    if (!filePath) {
        throw new Error(`Document not found: ${id}`);
    }

    const doc = await loadDoc(filePath);
    const visited = new Set<string>([id]);
    const results: RefEntry[] = [];
    await fetchRefs(root, doc.requires_load ?? [], visited, results);

    return {
        contents: [{
            uri,
            mimeType: 'application/json',
            text: JSON.stringify(results, null, 2),
        }],
    };
}
