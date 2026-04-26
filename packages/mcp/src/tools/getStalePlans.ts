import { getState } from '../../../app/dist/getState';
import { getActiveLoomRoot, loadWeave, buildLinkIndex } from '../../../fs/dist';
import { ConfigRegistry, getStalePlans } from '../../../core/dist';
import * as fs from 'fs-extra';

export const toolDef = {
    name: 'loom_get_stale_plans',
    description: 'List all plans whose design_version is behind the current design version (i.e. the design was updated after the plan was created). These plans may need to be revised.',
    inputSchema: {
        type: 'object' as const,
        properties: {},
        required: [],
    },
};

export async function handle(root: string, _args: Record<string, unknown>) {
    const registry = new ConfigRegistry();
    const state = await getState(
        { getActiveLoomRoot, loadWeave, buildLinkIndex, registry, fs, workspaceRoot: root }
    );

    const results = state.weaves.flatMap(weave =>
        getStalePlans(weave).map(plan => {
            const thread = weave.threads.find(t => t.plans.some(p => p.id === plan.id));
            return {
                planId: plan.id,
                planTitle: plan.title,
                weaveId: weave.id,
                threadId: thread?.id,
                planDesignVersion: plan.design_version,
                currentDesignVersion: thread?.design?.version,
            };
        })
    );

    return { content: [{ type: 'text' as const, text: JSON.stringify(results, null, 2) }] };
}
