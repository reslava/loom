import { getState } from '../../../app/dist/getState';
import { getActiveLoomRoot, loadWeave, buildLinkIndex } from '../../../fs/dist';
import { ConfigRegistry, isStepBlocked } from '../../../core/dist';
import { PlanDoc } from '../../../core/dist';
import { LinkIndex } from '../../../core/dist';
import * as fs from 'fs-extra';

export const toolDef = {
    name: 'loom_get_blocked_steps',
    description: 'List all blocked steps across all implementing plans. A step is blocked when its "Blocked by" dependencies are not yet satisfied.',
    inputSchema: {
        type: 'object' as const,
        properties: {},
        required: [],
    },
};

interface BlockedStep {
    planId: string;
    weaveId: string;
    threadId: string;
    stepNumber: number;
    stepDescription: string;
    blockedBy: string[];
}

export async function handle(root: string, _args: Record<string, unknown>) {
    const registry = new ConfigRegistry();
    const state = await getState(
        { getActiveLoomRoot, loadWeave, buildLinkIndex, registry, fs, workspaceRoot: root }
    );

    const index = state.index as LinkIndex;
    const blocked: BlockedStep[] = [];

    for (const weave of state.weaves) {
        for (const thread of weave.threads) {
            for (const plan of thread.plans as PlanDoc[]) {
                if (plan.status !== 'implementing') continue;
                for (const step of plan.steps ?? []) {
                    if (step.done) continue;
                    if (isStepBlocked(step, plan, index)) {
                        blocked.push({
                            planId: plan.id,
                            weaveId: weave.id,
                            threadId: thread.id,
                            stepNumber: step.order,
                            stepDescription: step.description,
                            blockedBy: step.blockedBy ?? [],
                        });
                    }
                }
            }
        }
    }

    return { content: [{ type: 'text' as const, text: JSON.stringify(blocked, null, 2) }] };
}
