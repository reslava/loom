import { resolveDocIdOrThrow, loadDoc } from '../../../fs/dist';

export async function handlePlanResource(root: string, uri: string) {
    const url = new URL(uri.replace('loom://', 'loom://host/'));
    const segments = url.pathname.replace(/^\//, '').split('/');
    // loom://plan/{id}  →  [plan, id]
    const id = segments.slice(1).join('/');

    if (!id) {
        throw new Error('loom://plan requires a plan id: loom://plan/{id}');
    }

    // Primary (agent-supplied) id → suggest-on-miss.
    const { filePath } = await resolveDocIdOrThrow(root, id);

    const doc = await loadDoc(filePath);
    if (doc.type !== 'plan') {
        throw new Error(`Document ${id} is not a plan (type: ${doc.type})`);
    }

    return {
        contents: [{
            uri,
            mimeType: 'application/json',
            text: JSON.stringify(doc, null, 2),
        }],
    };
}
