import { getActiveLoomRoot } from '../../fs/dist';
import { loadThread } from '../../fs/dist';
import { buildLinkIndex } from '../../fs/dist';
import { ConfigRegistry } from '../../core/dist/registry';
import { LoomState, LoomMode } from '../../core/dist/entities/state';
import { Thread } from '../../core/dist/entities/thread';
import { ThreadStatus } from '../../core/dist/entities/thread';
import { getThreadStatus } from '../../core/dist/derived';
import { filterThreadsByStatus, filterThreadsByPhase, filterThreadsById } from '../../core/dist/filters/threadFilters';
import { sortThreadsById } from '../../core/dist/filters/sorting';
import * as fs from 'fs-extra';
import * as path from 'path';

export interface GetStateInput {
    /** Optional filters to apply to the thread list. */
    threadFilter?: {
        status?: ThreadStatus[];
        phase?: string[];
        idPattern?: string;
    };
    /** Optional sorting for the thread list. */
    sortBy?: 'id' | 'created';
    /** Sort direction. Defaults to ascending. */
    sortOrder?: 'asc' | 'desc';
}

export interface GetStateDeps {
    getActiveLoomRoot: typeof getActiveLoomRoot;
    loadThread: typeof loadThread;
    buildLinkIndex: typeof buildLinkIndex;
    registry: ConfigRegistry;
    fs: typeof fs;
}

export async function getState(deps: GetStateDeps, input?: GetStateInput): Promise<LoomState> {
    const loomRoot = deps.getActiveLoomRoot();
    const registry = deps.registry;
    
    const isMono = registry.isMonoLoom();
    const mode: LoomMode = isMono ? 'mono' : 'multi';
    const loomName = isMono ? '(local)' : (registry.getActiveLoomName() || 'unknown');
    
    const threadsDir = path.join(loomRoot, 'threads');
    const allThreads: Thread[] = [];
    
    if (deps.fs.existsSync(threadsDir)) {
        const entries = await deps.fs.readdir(threadsDir);
        for (const entry of entries) {
            const threadPath = path.join(threadsDir, entry);
            const stat = await deps.fs.stat(threadPath);
            if (stat.isDirectory() && entry !== '_archive') {
                try {
                    const thread = await deps.loadThread(entry);
                    allThreads.push(thread);
                } catch (e) {
                    // Skip invalid threads
                }
            }
        }
    }
    
    let filteredThreads = allThreads;
    if (input?.threadFilter) {
        const { status, phase, idPattern } = input.threadFilter;
        if (status && status.length > 0) {
            filteredThreads = filterThreadsByStatus(filteredThreads, status);
        }
        if (phase && phase.length > 0) {
            filteredThreads = filterThreadsByPhase(filteredThreads, phase);
        }
        if (idPattern) {
            filteredThreads = filterThreadsById(filteredThreads, idPattern);
        }
    }
    
    if (input?.sortBy === 'id') {
        filteredThreads = sortThreadsById(filteredThreads, input.sortOrder !== 'desc');
    }
    
    // Build link index once
    const index = await deps.buildLinkIndex();
    
    const totalThreads = filteredThreads.length;
    const activeThreads = filteredThreads.filter(t => getThreadStatus(t) === 'ACTIVE').length;
    const implementingThreads = filteredThreads.filter(t => getThreadStatus(t) === 'IMPLEMENTING').length;
    const doneThreads = filteredThreads.filter(t => getThreadStatus(t) === 'DONE').length;
    const totalPlans = filteredThreads.reduce((sum, t) => sum + t.plans.length, 0);
    const stalePlans = filteredThreads.reduce((sum, t) => sum + t.plans.filter(p => p.staled).length, 0);
    
    let blockedSteps = 0;
    for (const thread of filteredThreads) {
        for (const plan of thread.plans) {
            if (plan.steps) {
                for (const step of plan.steps) {
                    if (!step.done && step.blockedBy && step.blockedBy.length > 0) {
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
        threads: filteredThreads,
        index,
        generatedAt: new Date().toISOString(),
        summary: {
            totalThreads,
            activeThreads,
            implementingThreads,
            doneThreads,
            totalPlans,
            stalePlans,
            blockedSteps,
        },
    };
}