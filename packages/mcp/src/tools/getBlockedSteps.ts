import { getBlockedSteps } from '../../../app/dist';
import { getActiveLoomRoot, loadWeave, buildLinkIndex } from '../../../fs/dist';
import { ConfigRegistry } from '../../../core/dist';
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

export async function handle(root: string, _args: Record<string, unknown>) {
    const registry = new ConfigRegistry();
    const blocked = await getBlockedSteps(
        { getActiveLoomRoot, loadWeave, buildLinkIndex, registry, fs, workspaceRoot: root }
    );

    return { content: [{ type: 'text' as const, text: JSON.stringify(blocked, null, 2) }] };
}
