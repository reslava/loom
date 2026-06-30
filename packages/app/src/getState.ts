import { getActiveLoomRoot } from '../../fs/dist';
import { loadWeave } from '../../fs/dist';
import { buildLinkIndex } from '../../fs/dist';
import { loadDoc } from '../../fs/dist';
import { ConfigRegistry } from '../../fs/dist';
import { LoomState, LoomMode } from '../../core/dist/entities/state';
import { Document } from '../../core/dist/entities/document';
import { ChatDoc } from '../../core/dist/entities/chat';
import { Weave, WeaveStatus } from '../../core/dist/entities/weave';
import { getWeaveStatus, staleEntries } from '../../core/dist/derived';
import { nowIso } from '../../core/dist/dates';
import { filterWeavesByStatus, filterWeavesByPhase, filterWeavesById } from '../../core/dist/filters/weaveFilters';
import { sortWeavesById } from '../../core/dist/filters/sorting';
import { isStepBlocked } from '../../core/dist/planUtils';
import { parseReq } from '../../core/dist/entities/req';
import { checkReqCoverage } from '../../core/dist/reqCoverage';
import * as fs from 'fs-extra';
import * as path from 'path';

export interface GetStateInput {
    weaveFilter?: {
        status?: WeaveStatus[];
        phase?: string[];
        idPattern?: string;
    };
    sortBy?: 'id' | 'created';
    sortOrder?: 'asc' | 'desc';
}

export interface GetStateDeps {
    getActiveLoomRoot: (wsRoot?: string) => string;
    loadWeave: (loomRoot: string, weaveId: string, index?: any, overrideWeavePath?: string) => Promise<Weave | null>;
    buildLinkIndex: (loomRoot: string) => Promise<any>;
    registry: ConfigRegistry;
    fs: typeof fs;
    workspaceRoot?: string;
}

export async function getState(deps: GetStateDeps, input?: GetStateInput): Promise<LoomState> {
    const loomRoot = deps.getActiveLoomRoot(deps.workspaceRoot);
    const registry = deps.registry;
    
    const isMono = registry.isMonoLoom();
    const mode: LoomMode = isMono ? 'mono' : 'multi';
    const loomName = isMono ? '(local)' : (registry.getActiveLoomName() || 'unknown');
    
    const weavesDir = path.join(loomRoot, 'loom');
    const allWeaves: Weave[] = [];
    const archivedWeaves: Weave[] = [];
    const archivedLooseDocs: Document[] = [];
    const globalDocs: Document[] = [];
    const globalChats: ChatDoc[] = [];

    const index = await deps.buildLinkIndex(loomRoot);

    if (deps.fs.existsSync(weavesDir)) {
        const entries = await deps.fs.readdir(weavesDir);
        for (const entry of entries) {
            const entryPath = path.join(weavesDir, entry);
            const stat = await deps.fs.stat(entryPath);
            if (stat.isDirectory() && entry !== '.archive') {
                if (entry === 'chats') {
                    // Global chats directory — load chat docs directly
                    const chatFiles = (await deps.fs.readdir(entryPath)).filter((f: string) => f.endsWith('.md'));
                    for (const f of chatFiles) {
                        try {
                            const doc = await loadDoc(path.join(entryPath, f));
                            if (doc.type === 'chat') globalChats.push(doc as ChatDoc);
                        } catch (e) {
                            // Skip invalid chat docs
                        }
                    }
                } else {
                    try {
                        const weave = await deps.loadWeave(loomRoot, entry, index);
                        if (weave) {
                            allWeaves.push(weave);
                        }
                    } catch (e) {
                        // Skip invalid weaves
                    }
                }
            } else if (stat.isFile() && entry.endsWith('.md')) {
                try {
                    globalDocs.push(await loadDoc(entryPath));
                } catch (e) {
                    // Skip docs with invalid frontmatter
                }
            }
        }
    }
    
    // Scan loom/.archive/ for archived weaves/thread containers and loose docs
    const archiveDir = path.join(weavesDir, '.archive');
    if (deps.fs.existsSync(archiveDir)) {
        const archiveEntries = await deps.fs.readdir(archiveDir).catch(() => [] as string[]);
        for (const entry of archiveEntries) {
            const archiveWeavePath = path.join(archiveDir, entry);
            const stat = await deps.fs.stat(archiveWeavePath).catch(() => null);
            if (!stat) continue;
            if (stat.isDirectory()) {
                try {
                    const weave = await deps.loadWeave(loomRoot, entry, index, archiveWeavePath);
                    if (weave) archivedWeaves.push(weave);
                } catch (e) {
                    // Skip invalid archive entries
                }
            } else if (stat.isFile() && entry.endsWith('.md')) {
                try {
                    archivedLooseDocs.push(await loadDoc(path.join(archiveDir, entry)));
                } catch (e) {
                    // Skip docs with invalid frontmatter
                }
            }
        }
    }

    let filteredWeaves = allWeaves;
    if (input?.weaveFilter) {
        const { status, phase, idPattern } = input.weaveFilter;
        if (status && status.length > 0) {
            filteredWeaves = filterWeavesByStatus(filteredWeaves, status);
        }
        if (phase && phase.length > 0) {
            filteredWeaves = filterWeavesByPhase(filteredWeaves, phase);
        }
        if (idPattern) {
            filteredWeaves = filterWeavesById(filteredWeaves, idPattern);
        }
    }
    
    if (input?.sortBy === 'id') {
        filteredWeaves = sortWeavesById(filteredWeaves, input.sortOrder !== 'desc');
    }
    
    const totalWeaves = filteredWeaves.length;
    const activeWeaves = filteredWeaves.filter(w => getWeaveStatus(w) === 'ACTIVE').length;
    const implementingWeaves = filteredWeaves.filter(w => getWeaveStatus(w) === 'IMPLEMENTING').length;
    const doneWeaves = filteredWeaves.filter(w => getWeaveStatus(w) === 'DONE').length;
    const totalPlans = filteredWeaves.reduce((sum, w) =>
        sum + w.threads.reduce((s, t) => s + t.plans.length, 0), 0);
    // Canonical staleness — ONE predicate (core `staleEntries`) feeds both the
    // summary counts here AND the per-thread set the VS Code tree reads, so the
    // extension never recomputes staleness locally and can't drift from `loom stale`.
    let stalePlans = 0;
    const staleIdeas = 0; // ideas are the root of the chain — never stale
    let staleDesigns = 0;
    for (const weave of filteredWeaves) {
        const entries = staleEntries(weave);
        for (const thread of weave.threads) {
            thread.stale = entries.filter(e => e.threadId === thread.id && e.actionable);
        }
        const stalePlanIds = new Set<string>();
        for (const e of entries) {
            if (!e.actionable) continue;
            if (e.reason === 'plan_design_stale' || e.reason === 'plan_req_stale') stalePlanIds.add(e.docId);
            else if (e.reason === 'design_stale') staleDesigns++;
        }
        stalePlans += stalePlanIds.size;
    }

    let blockedSteps = 0;
    for (const weave of filteredWeaves) {
        for (const thread of weave.threads) {
            for (const plan of thread.plans) {
                if (!plan.steps) continue;
                for (const step of plan.steps) {
                    if (plan.status === 'implementing' && step.status !== 'done' && step.status !== 'cancelled' && isStepBlocked(step, plan, index)) {
                        blockedSteps++;
                    }
                }
            }
        }
    }
    
    // req scope-coverage gaps: for each thread with a locked req and plans, check
    // the thread's combined plan steps against the req (uncovered Included, steps
    // citing an Excluded id, dangling citations).
    let reqCoverageGaps = 0;
    for (const weave of filteredWeaves) {
        for (const thread of weave.threads) {
            if (thread.req?.status !== 'locked' || thread.plans.length === 0) continue;
            const parsed = parseReq((thread.req as { content?: string }).content ?? '');
            const steps = thread.plans.flatMap(p => p.steps ?? []);
            const cov = checkReqCoverage(parsed, steps);
            // Attach the per-thread result so the tree can badge it without recomputing,
            // and fold its problems into the aggregate summary count (single pass).
            thread.reqCoverage = cov;
            reqCoverageGaps += cov.uncovered.length + cov.excludedViolations.length + cov.unknownCitations.length;
        }
    }

    return {
        loomRoot,
        mode,
        loomName,
        globalDocs,
        globalChats,
        weaves: filteredWeaves,
        archivedWeaves,
        archivedLooseDocs,
        index,
        generatedAt: nowIso(),
        summary: {
            totalWeaves,
            activeWeaves,
            implementingWeaves,
            doneWeaves,
            totalPlans,
            stalePlans,
            staleIdeas,
            staleDesigns,
            blockedSteps,
            reqCoverageGaps,
        },
    };
}