import { getState } from '../../../app/dist/getState';
import { getActiveLoomRoot, loadWeave, buildLinkIndex } from '../../../fs/dist';
import { parseReq, checkReqCoverage, buildRoadmap, isPlanIdRef, planRefId } from '../../../core/dist';
import { ConfigRegistry } from '../../../fs/dist';
import { LinkIndex } from '../../../core/dist/linkIndex';
import * as fs from 'fs-extra';

interface DiagnosticIssue {
    docId: string;
    issue: 'broken_parent_id' | 'dangling_child_id';
    detail: string;
}

/** A step's cross-plan `blockedBy` that points at a non-existent plan — warn-and-store's
 *  standing net. The write path stores such an edge verbatim; this is where it surfaces. */
interface BlockedByDanglingIssue {
    weaveSlug: string;
    threadSlug: string;
    planId: string;
    stepId: string;
    /** The blocker as stored (may carry a legacy trailing ordinal); `planId` is the resolved target. */
    ref: string;
}

interface ReqCoverageIssue {
    weaveSlug: string;
    threadSlug: string;
    /** Included requirement ids no plan step cites. */
    uncovered: string[];
    /** Steps citing an Excluded id. */
    excludedViolations: Array<{ stepOrder: number; id: string }>;
    /** Cited ids matching no Included/Constraint id. */
    unknownCitations: Array<{ stepOrder: number; id: string }>;
}

export async function handleDiagnosticsResource(root: string) {
    const registry = new ConfigRegistry();
    const state = await getState(
        { getActiveLoomRoot, loadWeave, buildLinkIndex, registry, fs, workspaceRoot: root }
    );

    const index = state.index as LinkIndex;
    const allIds = new Set(index.documents.keys());
    const issues: DiagnosticIssue[] = [];

    for (const [id, parentId] of index.parent.entries()) {
        if (!allIds.has(parentId)) {
            issues.push({ docId: id, issue: 'broken_parent_id', detail: `parent_id '${parentId}' not found in index` });
        }
    }

    for (const [id, childSet] of index.children.entries()) {
        for (const childId of childSet) {
            if (!allIds.has(childId)) {
                issues.push({ docId: id, issue: 'dangling_child_id', detail: `child_id '${childId}' not found in index` });
            }
        }
    }

    // req scope-coverage: per thread with a locked req + plans, where the plan(s)
    // dropped an Included requirement, cited an Excluded one, or cited a dangling id.
    const reqCoverage: ReqCoverageIssue[] = [];
    for (const weave of state.weaves) {
        for (const thread of weave.threads) {
            if (thread.req?.status !== 'locked' || thread.plans.length === 0) continue;
            const parsed = parseReq((thread.req as { content?: string }).content ?? '');
            const steps = thread.plans.flatMap(p => p.steps ?? []);
            const cov = checkReqCoverage(parsed, steps);
            if (cov.uncovered.length || cov.excludedViolations.length || cov.unknownCitations.length) {
                reqCoverage.push({
                    weaveSlug: weave.id,
                    threadSlug: thread.id,
                    uncovered: cov.uncovered.map(i => i.id),
                    excludedViolations: cov.excludedViolations,
                    unknownCitations: cov.unknownCitations,
                });
            }
        }
    }

    // Step-level cross-plan dangling blockers: a step's blockedBy names a `pl_…` (or legacy
    // "{slug}-plan-NNN") plan that does not exist. This is the standing guarantee behind
    // warn-and-store — the write path stores the edge verbatim, and this recompute is what
    // keeps it from being silent. Mirrors the roadmap's thread-level `dangling_dep`, one layer down.
    const blockedByDangling: BlockedByDanglingIssue[] = [];
    for (const weave of state.weaves) {
        for (const thread of weave.threads) {
            for (const plan of thread.plans) {
                for (const step of plan.steps ?? []) {
                    for (const ref of step.blockedBy ?? []) {
                        if (!isPlanIdRef(ref)) continue;
                        const planId = planRefId(ref);
                        const entry = index.documents.get(planId);
                        if (!entry || !entry.exists) {
                            blockedByDangling.push({ weaveSlug: weave.id, threadSlug: thread.id, planId, stepId: step.id, ref });
                        }
                    }
                }
            }
        }
    }

    // Roadmap diagnostics: depends_on cycles, dangling dependency targets, and
    // threads missing thread.md (→ run `loom migrate`). Derived from the same state.
    const roadmapDiagnostics = buildRoadmap(state).diagnostics;

    return {
        contents: [{
            uri: 'loom://diagnostics',
            mimeType: 'application/json',
            text: JSON.stringify({ issueCount: issues.length, issues, reqCoverage, blockedByDangling, roadmap: roadmapDiagnostics }, null, 2),
        }],
    };
}
