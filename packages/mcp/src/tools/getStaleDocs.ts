import { getState } from '../../../app/dist/getState';
import { getActiveLoomRoot, loadWeave, buildLinkIndex } from '../../../fs/dist';
import { ConfigRegistry, getStalePlans, Document } from '../../../core/dist';
import * as fs from 'fs-extra';

export const toolDef = {
    name: 'loom_get_stale_docs',
    description: 'List all documents that may be stale: plans behind their design version, and docs whose parent was updated after the doc was created/updated.',
    inputSchema: {
        type: 'object' as const,
        properties: {},
        required: [],
    },
};

interface StaleDoc {
    id: string;
    type: string;
    title: string;
    weaveId: string;
    threadId?: string;
    reason: string;
}

function isNewerDate(a: string | undefined, b: string | undefined): boolean {
    if (!a || !b) return false;
    return a > b;
}

export async function handle(root: string, _args: Record<string, unknown>) {
    const registry = new ConfigRegistry();
    const state = await getState(
        { getActiveLoomRoot, loadWeave, buildLinkIndex, registry, fs, workspaceRoot: root }
    );

    const stale: StaleDoc[] = [];
    const docById = new Map<string, Document>();

    for (const weave of state.weaves) {
        for (const doc of weave.allDocs as Document[]) {
            docById.set(doc.id, doc);
        }
    }

    for (const weave of state.weaves) {
        // Stale plans
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
            const allDocs = thread.allDocs as Document[];
            for (const doc of allDocs) {
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

    return { content: [{ type: 'text' as const, text: JSON.stringify(stale, null, 2) }] };
}
