import { getState } from '../../../app/dist/getState';
import { getActiveLoomRoot, loadWeave, buildLinkIndex } from '../../../fs/dist';
import { ConfigRegistry } from '../../../core/dist';
import * as fs from 'fs-extra';

export async function handleStateResource(root: string, uri: string) {
    const url = new URL(uri.replace('loom://', 'loom://host/'));
    const weaveId = url.searchParams.get('weaveId') ?? undefined;
    const threadId = url.searchParams.get('threadId') ?? undefined;

    if (threadId && !weaveId) {
        throw new Error('threadId requires weaveId');
    }

    const registry = new ConfigRegistry();
    const state = await getState(
        { getActiveLoomRoot, loadWeave, buildLinkIndex, registry, fs, workspaceRoot: root },
        weaveId ? { weaveFilter: { idPattern: weaveId } } : undefined
    );

    return {
        contents: [{
            uri,
            mimeType: 'application/json',
            text: JSON.stringify(state, null, 2),
        }],
    };
}
