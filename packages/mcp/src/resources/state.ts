import { getState } from '../../../app/dist/getState';
import { getActiveLoomRoot, loadWeave, buildLinkIndex } from '../../../fs/dist';
import { ConfigRegistry } from '../../../core/dist';
import * as fs from 'fs-extra';

const VALID_STATUSES = ['CANCELLED', 'IMPLEMENTING', 'ACTIVE', 'DONE', 'BLOCKED'] as const;
type WeaveStatus = typeof VALID_STATUSES[number];

export async function handleStateResource(root: string, uri: string) {
    const url = new URL(uri.replace('loom://', 'loom://host/'));
    const weaveId = url.searchParams.get('weaveId') ?? undefined;
    const threadId = url.searchParams.get('threadId') ?? undefined;
    const statusParam = url.searchParams.get('status') ?? undefined;
    const includeParam = url.searchParams.get('include') ?? undefined;

    if (threadId && !weaveId) {
        throw new Error('threadId requires weaveId');
    }

    const status: WeaveStatus[] | undefined = statusParam
        ? statusParam
            .split(',')
            .map(s => s.trim().toUpperCase())
            .filter((s): s is WeaveStatus => (VALID_STATUSES as readonly string[]).includes(s))
        : undefined;

    const weaveFilter = (weaveId || (status && status.length > 0))
        ? {
            ...(weaveId ? { idPattern: weaveId } : {}),
            ...(status && status.length > 0 ? { status } : {}),
        }
        : undefined;

    const registry = new ConfigRegistry();
    const state = await getState(
        { getActiveLoomRoot, loadWeave, buildLinkIndex, registry, fs, workspaceRoot: root },
        weaveFilter ? { weaveFilter } : undefined
    );

    const includeContent = includeParam === 'content';
    const replacer = includeContent
        ? undefined
        : (key: string, value: unknown) => (key === 'content' ? undefined : value);

    return {
        contents: [{
            uri,
            mimeType: 'application/json',
            text: JSON.stringify(state, replacer, 2),
        }],
    };
}
