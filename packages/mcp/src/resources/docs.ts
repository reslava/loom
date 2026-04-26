import * as fs from 'fs-extra';
import { findDocumentById } from '../../../fs/dist';

export async function handleDocsResource(root: string, uri: string) {
    const url = new URL(uri.replace('loom://', 'loom://host/'));
    const segments = url.pathname.replace(/^\//, '').split('/');
    // loom://docs/{id}  →  pathname = /docs/{id}
    const id = segments.slice(1).join('/');

    if (!id) {
        throw new Error('loom://docs requires a document id: loom://docs/{id}');
    }

    const filePath = await findDocumentById(root, id);
    if (!filePath) {
        throw new Error(`Document not found: ${id}`);
    }

    const text = await fs.readFile(filePath, 'utf8');

    return {
        contents: [{
            uri,
            mimeType: 'text/plain',
            text,
        }],
    };
}
