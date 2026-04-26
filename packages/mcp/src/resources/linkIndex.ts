import { buildLinkIndex } from '../../../fs/dist';

export async function handleLinkIndexResource(root: string) {
    const index = await buildLinkIndex(root);

    return {
        contents: [{
            uri: 'loom://link-index',
            mimeType: 'application/json',
            text: JSON.stringify(index, null, 2),
        }],
    };
}
