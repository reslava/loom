import * as path from 'path';
import { getState, GetStateDeps } from './getState';
import { saveDoc, loadDoc } from '../../fs/dist';
import { DesignDoc, ReqDoc } from '../../core/dist';

/**
 * `backfill-staleness-baselines` migration — bring existing docs onto the directional,
 * version-based staleness model (loom/refs/staleness-reference.md):
 *   - stamp each design's `idea_version` = its idea's current version;
 *   - stamp each req's `design_version` = its design's current version, and repoint
 *     `req.parent_id` from the idea to the design (req depends on design).
 *
 * Idempotent and `--dry-run` capable. Mirrors `backfillDesignVersions`. Run once per
 * project (this repo + downstream installs) after upgrading.
 */

export interface BackfillStalenessBaselinesDeps extends GetStateDeps {
    saveDoc: typeof saveDoc;
    loadDoc: typeof loadDoc;
}

export interface BackfillStalenessBaselinesResult {
    changed: Array<{ path: string; field: string; from: string | number | null | undefined; to: string | number }>;
    scanned: number;
    failed: Array<{ path: string; error: string }>;
    dryRun: boolean;
}

export async function backfillStalenessBaselines(
    opts: { dryRun?: boolean },
    deps: BackfillStalenessBaselinesDeps,
): Promise<BackfillStalenessBaselinesResult> {
    const state = await getState(deps);
    const loomRoot = deps.getActiveLoomRoot(deps.workspaceRoot);
    const dryRun = !!opts.dryRun;
    const changed: BackfillStalenessBaselinesResult['changed'] = [];
    const failed: BackfillStalenessBaselinesResult['failed'] = [];
    let scanned = 0;
    const rel = (p: string) => path.relative(loomRoot, p);

    for (const weave of state.weaves) {
        for (const thread of weave.threads) {
            const threadPath = path.join(loomRoot, 'loom', weave.id, thread.id);

            // design <- idea: stamp design.idea_version = idea.version, and strip the
            // dead `req_version` (a design no longer depends on the req — the field was
            // removed from the model). The design is re-saved either way, so it's free.
            if (thread.design && thread.idea) {
                scanned++;
                const designPath = path.join(threadPath, `${thread.id}-design.md`);
                const needsIdeaVersion = thread.design.idea_version !== thread.idea.version;
                const staleReqVersion = (thread.design as { req_version?: number }).req_version;
                const hasDeadReqVersion = staleReqVersion !== undefined;
                if (needsIdeaVersion || hasDeadReqVersion) {
                    try {
                        if (!dryRun) {
                            const d = (await deps.loadDoc(designPath)) as DesignDoc;
                            d.idea_version = thread.idea.version;
                            delete (d as { req_version?: number }).req_version;
                            await deps.saveDoc(d, designPath);
                        }
                        if (needsIdeaVersion) changed.push({ path: rel(designPath), field: 'idea_version', from: thread.design.idea_version, to: thread.idea.version });
                        if (hasDeadReqVersion) changed.push({ path: rel(designPath), field: 'req_version', from: staleReqVersion, to: 'removed' });
                    } catch (e: any) {
                        failed.push({ path: rel(designPath), error: e?.message ?? String(e) });
                    }
                }
            }

            // req <- design: stamp req.design_version = design.version, repoint parent
            if (thread.req && thread.design) {
                scanned++;
                const reqPath = path.join(threadPath, 'req.md');
                const needsVersion = thread.req.design_version !== thread.design.version;
                const needsParent = thread.req.parent_id !== thread.design.id;
                if (needsVersion || needsParent) {
                    try {
                        if (!dryRun) {
                            const r = (await deps.loadDoc(reqPath)) as ReqDoc;
                            r.design_version = thread.design.version;
                            r.parent_id = thread.design.id;
                            await deps.saveDoc(r, reqPath);
                        }
                        if (needsVersion) changed.push({ path: rel(reqPath), field: 'design_version', from: thread.req.design_version, to: thread.design.version });
                        if (needsParent) changed.push({ path: rel(reqPath), field: 'parent_id', from: thread.req.parent_id, to: thread.design.id });
                    } catch (e: any) {
                        failed.push({ path: rel(reqPath), error: e?.message ?? String(e) });
                    }
                }
            }
        }
    }

    return { changed, scanned, failed, dryRun };
}
