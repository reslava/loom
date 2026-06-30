import { getState } from '../../../app/dist/getState';
import { getActiveLoomRoot, loadWeave, buildLinkIndex } from '../../../fs/dist';
import { ConfigRegistry } from '../../../fs/dist';
import { toStateSummary } from '../../../core/dist';
import * as fs from 'fs-extra';
import { initStateCache, getCachedState, setCachedState } from '../stateCache';

const VALID_STATUSES = ['CANCELLED', 'IMPLEMENTING', 'ACTIVE', 'DONE', 'BLOCKED'] as const;
type WeaveStatus = typeof VALID_STATUSES[number];

export async function handleStateResource(root: string, uri: string) {
    const startedAt = Date.now();
    const url = new URL(uri.replace('loom://', 'loom://host/'));
    const weaveId = url.searchParams.get('weaveId') ?? undefined;
    const statusParam = url.searchParams.get('status') ?? undefined;
    const includeParam = url.searchParams.get('include') ?? undefined;
    const shapeParam = url.searchParams.get('shape') ?? undefined;

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
    const isSummary = shapeParam === 'summary';
    // `shape` only changes serialization, never what state we load — so it does
    // not affect caching. An unfiltered read (with or without ?shape=summary) is
    // the tree's hot path and reuses the cached full state.
    const isUnfiltered = !weaveFilter && !includeContent;

    initStateCache(root);

    // Resolve the full state once: cached for unfiltered reads (the tree's hot
    // path), recomputed for filtered ones (session-start, status queries).
    let state = isUnfiltered ? getCachedState() : null;
    const cacheHit = state != null;
    if (!state) {
        const registry = new ConfigRegistry();
        state = await getState(
            { getActiveLoomRoot, loadWeave, buildLinkIndex, registry, fs, workspaceRoot: root },
            weaveFilter ? { weaveFilter } : undefined
        );
        if (isUnfiltered) setCachedState(state);
    }

    // Serialize per requested shape. The summary projection is the cheap
    // session-start map (skeleton + status, no step bodies / doc content) and is
    // emitted compact — indentation was ~28% of the full payload and nothing reads
    // it raw. The full shape keeps its pretty-printed, content-stripped form.
    let text: string;
    if (isSummary) {
        text = JSON.stringify(toStateSummary(state));
    } else {
        const replacer = includeContent
            ? undefined
            : (key: string, value: unknown) => (key === 'content' ? undefined : value);
        text = JSON.stringify(state, replacer, 2);
    }

    process.stderr.write(`[state] read uri=${uri} shape=${shapeParam ?? 'full'} cacheHit=${cacheHit} totalMs=${Date.now() - startedAt}\n`);
    return {
        contents: [{ uri, mimeType: 'application/json', text }],
    };
}
