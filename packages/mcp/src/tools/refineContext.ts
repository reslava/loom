import { findDocumentById, loadDoc } from '../../../fs/dist';
import { Document } from '../../../core/dist';
import { handleContextResource } from '../resources/context';

/**
 * Assemble the `extraContext` for a refine tool: the doc's Unified Context bundle
 * (which injects the thread's locked req BEFORE the parent chain) followed by any
 * caller-supplied context_ids.
 *
 * All context IO lives here in the mcp layer so the app refine use-cases stay
 * pure/IO-free (the same split the generate tools use). Best-effort: if the
 * bundle can't be assembled the refine still runs, just without req framing.
 */
export async function buildRefineExtraContext(
    root: string,
    canonicalId: string,
    contextIds: string[],
): Promise<string | undefined> {
    const parts: string[] = [];

    try {
        const ctx = await handleContextResource(
            root,
            `loom://context/${encodeURIComponent(canonicalId)}?mode=refine`,
        );
        const text = ctx.contents[0]?.text;
        if (text) parts.push(text);
    } catch { /* best-effort — refine still works without the bundle */ }

    for (const cid of contextIds) {
        try {
            const fp = await findDocumentById(root, cid);
            if (!fp) continue;
            const doc = await loadDoc(fp) as Document;
            parts.push(`### ${doc.title} (${doc.type})\n\n${(doc as any).content ?? ''}`);
        } catch { /* skip unresolvable enrichment id */ }
    }

    return parts.length ? parts.join('\n\n---\n\n') : undefined;
}
