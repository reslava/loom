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

/**
 * Retrieves the complete derived state of the active loom, with optional filtering and sorting.
 *
 * @param deps - Filesystem, thread loading, and registry dependencies.
 * @param input - Optional filtering and sorting parameters.
 * @returns A promise resolving to the full LoomState.
 */
export async function getState(deps: GetStateDeps, input?: GetStateInput): Promise<LoomState> {
    const loomRoot = deps.getActiveLoomRoot();
    const registry = deps.registry;
    
    // Determine mode and loom name
    const isMono = registry.isMonoLoom();
    const mode: LoomMode = isMono ? 'mono' : 'multi';
    const loomName = isMono ? '(local)' : (registry.getActiveLoomName() || 'unknown');
    
    // Load all threads
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
                    // Skip invalid threads; they will be reported by validate
                }
            }
        }
    }
    
    // Apply filters if provided
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
    
    // Apply sorting if requested
    if (input?.sortBy === 'id') {
        filteredThreads = sortThreadsById(filteredThreads, input.sortOrder !== 'desc');
    }
    // Note: sorting by 'created' requires storing thread creation date; not yet implemented.
    
    // Build link index for statistics (based on filtered threads)
    const index = await deps.buildLinkIndex();
    
    // Calculate summary statistics based on the filtered thread set
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