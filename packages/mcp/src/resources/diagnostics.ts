import { getState } from '../../../app/dist/getState';
import { getActiveLoomRoot, loadWeave, buildLinkIndex } from '../../../fs/dist';
import { ConfigRegistry, parseReq, checkReqCoverage, buildRoadmap } from '../../../core/dist';
import { LinkIndex } from '../../../core/dist/linkIndex';
import * as fs from 'fs-extra';

interface DiagnosticIssue {
    docId: string;
    issue: 'broken_parent_id' | 'dangling_child_id';
    detail: string;
}

interface ReqCoverageIssue {
    weaveId: string;
    threadId: string;
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
                    weaveId: weave.id,
                    threadId: thread.id,
                    uncovered: cov.uncovered.map(i => i.id),
                    excludedViolations: cov.excludedViolations,
                    unknownCitations: cov.unknownCitations,
                });
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
            text: JSON.stringify({ issueCount: issues.length, issues, reqCoverage, roadmap: roadmapDiagnostics }, null, 2),
        }],
    };
}
