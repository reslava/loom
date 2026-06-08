import { getState, GetStateDeps } from './getState';
import { getStalePlans } from '../../core/dist';
import { Document } from '../../core/dist/entities/document';

export interface StaleDoc {
    id: string;
    type: string;
    title: string;
    weaveId: string;
    threadId?: string;
    reason: string;
}

export type GetStaleDocsDeps = GetStateDeps;

function isNewerDate(a: string | undefined, b: string | undefined): boolean {
    if (!a || !b) return false;
    return a > b;
}

/**
 * List documents that may be stale: plans behind their design version, and docs
 * whose parent was updated after the doc itself was created/updated.
 *
 * Single source of truth for staleness listing: both the `loom_get_stale_docs` MCP
 * tool and the `loom stale` CLI command call this use-case.
 */
export async function getStaleDocs(deps: GetStaleDocsDeps): Promise<StaleDoc[]> {
    const state = await getState(deps);

    const stale: StaleDoc[] = [];
    const docById = new Map<string, Document>();

    for (const weave of state.weaves) {
        for (const doc of weave.allDocs as Document[]) {
            docById.set(doc.id, doc);
        }
    }

    for (const weave of state.weaves) {
        // Stale plans (design_version behind current design version)
        for (const plan of getStalePlans(weave)) {
            const thread = weave.threads.find(t => t.plans.some(p => p.id === plan.id));
            stale.push({
                id: plan.id,
                type: 'plan',
                title: plan.title,
                weaveId: weave.id,
                threadId: thread?.id,
                reason: `design_version ${plan.design_version} < current ${thread?.design?.version}`,
            });
        }

        // Docs whose parent was updated after this doc was created
        for (const thread of weave.threads) {
            for (const doc of thread.allDocs as Document[]) {
                if (!doc.parent_id) continue;
                const parent = docById.get(doc.parent_id);
                if (!parent) continue;
                const parentUpdated = parent.updated ?? parent.created;
                const docCreated = doc.updated ?? doc.created;
                if (isNewerDate(parentUpdated, docCreated)) {
                    if (stale.some(s => s.id === doc.id)) continue; // already listed as stale plan
                    stale.push({
                        id: doc.id,
                        type: doc.type,
                        title: doc.title,
                        weaveId: weave.id,
                        threadId: thread.id,
                        reason: `parent "${doc.parent_id}" updated ${parentUpdated} after this doc's ${docCreated}`,
                    });
                }
            }
        }
    }

    return stale;
}
