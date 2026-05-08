import { getState } from '../../../app/dist/getState';
import { getActiveLoomRoot, loadWeave, buildLinkIndex } from '../../../fs/dist';
import { ConfigRegistry } from '../../../core/dist';
import * as fs from 'fs-extra';
import { initStateCache, getCachedState, setCachedState } from '../stateCache';

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

    const includeContent = includeParam === 'content';
    const isUnfiltered = !weaveFilter && !includeContent;

    initStateCache(root);

    // Return cached state for unfiltered full-state reads (the tree's hot path).
    // Filtered reads (session-start prompts, status queries) always recompute.
    if (isUnfiltered) {
        const cached = getCachedState();
        if (cached) {
            const replacer = (key: string, value: unknown) => (key === 'content' ? undefined : value);
            return {
                contents: [{
                    uri,
                    mimeType: 'application/json',
                    text: JSON.stringify(cached, replacer, 2),
                }],
            };
        }
    }

    const registry = new ConfigRegistry();
    const state = await getState(
        { getActiveLoomRoot, loadWeave, buildLinkIndex, registry, fs, workspaceRoot: root },
        weaveFilter ? { weaveFilter } : undefined
    );

    if (isUnfiltered) {
        setCachedState(state);
    }

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
