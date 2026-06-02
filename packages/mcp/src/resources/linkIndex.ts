import { buildLinkIndex } from '../../../fs/dist';
import type { LinkIndex } from '../../../core/dist/linkIndex';

/**
 * Converts a Map to a plain id-keyed object. `JSON.stringify` of a Map yields `{}`
 * (Maps have no enumerable own properties), which is why the raw LinkIndex used to
 * serialize as all-empty objects over the wire — this is the fix.
 */
function mapToObject<V>(map: Map<string, V>, transform?: (value: V) => unknown): Record<string, unknown> {
    const out: Record<string, unknown> = {};
    for (const [key, value] of map) {
        out[key] = transform ? transform(value) : value;
    }
    return out;
}

/**
 * Serializes a LinkIndex into a JSON-safe, id-keyed shape. Maps become plain objects
 * and Sets become arrays, so `byId` / `documents` (the id→path data) actually reach
 * the client instead of being dropped as `{}`.
 */
export function serializeLinkIndex(index: LinkIndex) {
    return {
        documents: mapToObject(index.documents),
        byId: mapToObject(index.byId),
        bySlug: mapToObject(index.bySlug),
        backlinks: mapToObject(index.backlinks),
        children: mapToObject(index.children, (set: Set<string>) => [...set]),
        parent: mapToObject(index.parent),
        stepBlockers: mapToObject(index.stepBlockers),
    };
}

export async function handleLinkIndexResource(root: string) {
    const index = await buildLinkIndex(root);

    return {
        contents: [{
            uri: 'loom://link-index',
            mimeType: 'application/json',
            text: JSON.stringify(serializeLinkIndex(index), null, 2),
        }],
    };
}
