import { getState, GetStateDeps } from './getState';
import { staleEntries } from '../../core/dist';
import { Document } from '../../core/dist/entities/document';

export interface StaleDoc {
    id: string;
    type: string;
    title: string;
    weaveSlug: string;
    threadSlug?: string;
    reason: string;
}

export interface GetStaleDocsOptions {
    /** Include done/cancelled (historical) stale docs too. Default false (actionable only). */
    includeDone?: boolean;
}

export type GetStaleDocsDeps = GetStateDeps;

/**
 * List documents that may be stale, via the single canonical `staleEntries`
 * predicate (core) — the same one `getState` attaches to each thread for the VS
 * Code tree, so `loom stale` and the extension always agree. A doc flagged for
 * more than one reason is listed once with its reasons joined.
 *
 * Single source of truth for staleness listing: both the `loom_get_stale_docs`
 * MCP tool and the `loom stale` CLI command call this use-case. By default only
 * actionable entries (not on done/cancelled/closed docs) are returned; pass
 * `includeDone` for the full historical view (`loom stale --all`).
 */
export async function getStaleDocs(
    deps: GetStaleDocsDeps,
    opts?: GetStaleDocsOptions,
): Promise<StaleDoc[]> {
    const state = await getState(deps);
    const includeDone = opts?.includeDone ?? false;

    // Title lookup across every doc (weave-level and thread-level).
    const docById = new Map<string, Document>();
    for (const weave of state.weaves) {
        for (const doc of weave.allDocs as Document[]) docById.set(doc.id, doc);
        for (const thread of weave.threads) {
            for (const doc of thread.allDocs as Document[]) docById.set(doc.id, doc);
        }
    }

    // Group entries by doc so a doc stale for >1 reason is listed once (stable count).
    const byDoc = new Map<string, { id: string; type: string; weaveSlug: string; threadSlug?: string; reasons: string[] }>();
    for (const weave of state.weaves) {
        for (const e of staleEntries(weave)) {
            if (!includeDone && !e.actionable) continue;
            const reasonText = `${e.reason}: ${e.detail}`;
            const existing = byDoc.get(e.docId);
            if (existing) {
                existing.reasons.push(reasonText);
            } else {
                byDoc.set(e.docId, { id: e.docId, type: e.type, weaveSlug: e.weaveSlug, threadSlug: e.threadSlug, reasons: [reasonText] });
            }
        }
    }

    return [...byDoc.values()].map(g => ({
        id: g.id,
        type: g.type,
        title: docById.get(g.id)?.title ?? g.id,
        weaveSlug: g.weaveSlug,
        threadSlug: g.threadSlug,
        reason: g.reasons.join('; '),
    }));
}
