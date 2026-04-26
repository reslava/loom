import { getState } from '../../../app/dist/getState';
import { getActiveLoomRoot, loadWeave, buildLinkIndex } from '../../../fs/dist';
import { ConfigRegistry } from '../../../core/dist';
import * as fs from 'fs-extra';

export async function handleSummaryResource(root: string) {
    const registry = new ConfigRegistry();
    const state = await getState(
        { getActiveLoomRoot, loadWeave, buildLinkIndex, registry, fs, workspaceRoot: root }
    );

    return {
        contents: [{
            uri: 'loom://summary',
            mimeType: 'application/json',
            text: JSON.stringify(state.summary, null, 2),
        }],
    };
}
