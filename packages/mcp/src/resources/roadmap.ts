import { getState } from '../../../app/dist/getState';
import { getActiveLoomRoot, loadWeave, buildLinkIndex } from '../../../fs/dist';
import { ConfigRegistry, buildRoadmap } from '../../../core/dist';
import * as fs from 'fs-extra';
import { initStateCache, getCachedState, setCachedState } from '../stateCache';

/**
 * `loom://roadmap` — the derived cross-weave roadmap. A thin renderer over the
 * pure `buildRoadmap(state)` read-model in core: roadmap (present+future in one
 * topo + priority order, status per-node), history (shipped plans newest first),
 * and diagnostics (cycles, dangling deps, threads missing thread.md).
 * Reuses the unfiltered full-state cache (the same hot path as loom://state).
 * Pure read — never mutates.
 */
export async function handleRoadmapResource(root: string, uri: string) {
    const startedAt = Date.now();
    initStateCache(root);

    let state = getCachedState();
    if (!state) {
        const registry = new ConfigRegistry();
        state = await getState({ getActiveLoomRoot, loadWeave, buildLinkIndex, registry, fs, workspaceRoot: root });
        setCachedState(state);
    }

    const roadmap = buildRoadmap(state);
    process.stderr.write(`[roadmap] read uri=${uri} totalMs=${Date.now() - startedAt}\n`);
    return {
        contents: [{ uri, mimeType: 'application/json', text: JSON.stringify(roadmap, null, 2) }],
    };
}
