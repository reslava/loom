import { getActiveLoomRoot } from '../../fs/dist';
import { loadWeave } from '../../fs/dist';
import { buildLinkIndex } from '../../fs/dist';
import { loadDoc } from '../../fs/dist';
import { ConfigRegistry } from '../../core/dist/registry';
import { LoomState, LoomMode } from '../../core/dist/entities/state';
import { Document } from '../../core/dist/entities/document';
import { ChatDoc } from '../../core/dist/entities/chat';
import { Weave, WeaveStatus } from '../../core/dist/entities/weave';
import { getWeaveStatus } from '../../core/dist/derived';
import { filterWeavesByStatus, filterWeavesByPhase, filterWeavesById } from '../../core/dist/filters/weaveFilters';
import { sortWeavesById } from '../../core/dist/filters/sorting';
import { isStepBlocked } from '../../core/dist/planUtils';
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
    loadWeave: (loomRoot: string, weaveId: string, index?: any) => Promise<Weave | null>;
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
    const stalePlans = filteredWeaves.reduce((sum, w) => {
        return sum + w.threads.reduce((ts, thread) => {
            if (!thread.design) return ts;
            return ts + thread.plans.filter(p => p.design_version < thread.design!.version).length;
        }, 0);
    }, 0);

    let blockedSteps = 0;
    for (const weave of filteredWeaves) {
        for (const thread of weave.threads) {
            for (const plan of thread.plans) {
                if (!plan.steps) continue;
                for (const step of plan.steps) {
                    if (!step.done && isStepBlocked(step, plan, index)) {
                        blockedSteps++;
                    }
                }
            }
        }
    }
    
    return {
        loomRoot,
        mode,
        loomName,
        globalDocs,
        globalChats,
        weaves: filteredWeaves,
        index,
        generatedAt: new Date().toISOString(),
        summary: {
            totalWeaves,
            activeWeaves,
            implementingWeaves,
            doneWeaves,
            totalPlans,
            stalePlans,
            blockedSteps,
        },
    };
}