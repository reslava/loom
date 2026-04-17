import { getActiveLoomRoot, loadThread, buildLinkIndex } from '../../fs/dist';
import { getThreadStatus, getThreadPhase } from '../../core/dist/derived';
import { LinkIndex } from '../../core/dist/linkIndex';
import { PlanDoc } from '../../core/dist/entities/plan';
import * as fs from 'fs-extra';
import * as path from 'path';

export interface StatusInput {
    threadId?: string;
    verbose?: boolean;
    json?: boolean;
    tokens?: boolean;
}

export interface StatusDeps {
    getActiveLoomRoot: typeof getActiveLoomRoot;
    loadThread: typeof loadThread;
    buildLinkIndex: typeof buildLinkIndex;
    fs: typeof fs;
}

export interface ThreadStatusResult {
    id: string;
    status: string;
    phase: string;
    designVersion: number;
    designTitle: string;
    planCount: number;
    plansDone: number;
    activePlan?: {
        id: string;
        status: string;
        stepsDone: number;
        stepsTotal: number;
        steps: Array<{
            order: number;
            description: string;
            done: boolean;
            blockedBy: string[];
            isBlocked: boolean;
        }>;
        nextStep?: { order: number; description: string };
    };
}

function isStepBlocked(step: { order: number; blockedBy: string[] }, plan: PlanDoc, index: LinkIndex): boolean {
    if (!step.blockedBy || step.blockedBy.length === 0) return false;

    for (const blocker of step.blockedBy) {
        const stepMatch = blocker.match(/^Step\s+(\d+)$/i);
        if (stepMatch) {
            const stepNum = parseInt(stepMatch[1], 10);
            const targetStep = plan.steps?.find(s => s.order === stepNum);
            if (targetStep && !targetStep.done) return true;
            continue;
        }

        if (blocker.includes('-plan-')) {
            const planEntry = index.documents.get(blocker);
            if (!planEntry) return true;
            if (!planEntry.exists) return true;
            return true;
        }
    }

    return false;
}

function findNextStep(plan: PlanDoc, index: LinkIndex): { order: number; description: string } | null {
    if (!plan.steps) return null;

    for (const step of plan.steps) {
        if (step.done) continue;
        if (!isStepBlocked(step, plan, index)) {
            return { order: step.order, description: step.description };
        }
    }

    return null;
}

export async function status(
    input: StatusInput,
    deps: StatusDeps
): Promise<{ single?: ThreadStatusResult; list?: Array<{ id: string; status: string }> }> {
    const loomRoot = deps.getActiveLoomRoot();
    const threadsDir = path.join(loomRoot, 'threads');
    const index = await deps.buildLinkIndex();

    if (input.threadId) {
        const thread = await deps.loadThread(input.threadId);
        const status = getThreadStatus(thread);
        const phase = getThreadPhase(thread);
        const activePlan = thread.plans.find(p => p.status === 'implementing' || p.status === 'active');

        const result: ThreadStatusResult = {
            id: thread.id,
            status,
            phase,
            designVersion: thread.design.version,
            designTitle: thread.design.title,
            planCount: thread.plans.length,
            plansDone: thread.plans.filter(p => p.status === 'done').length,
        };

        if (activePlan) {
            const steps = activePlan.steps || [];
            const stepsDone = steps.filter(s => s.done).length;
            result.activePlan = {
                id: activePlan.id,
                status: activePlan.status,
                stepsDone,
                stepsTotal: steps.length,
                steps: steps.map(s => ({
                    order: s.order,
                    description: s.description,
                    done: s.done,
                    blockedBy: s.blockedBy || [],
                    isBlocked: !s.done && isStepBlocked(s, activePlan, index),
                })),
                nextStep: findNextStep(activePlan, index) || undefined,
            };
        }

        return { single: result };
    }

    // List all threads
    if (!deps.fs.existsSync(threadsDir)) {
        return { list: [] };
    }

    const entries = await deps.fs.readdir(threadsDir);
    const list: Array<{ id: string; status: string }> = [];

    for (const entry of entries) {
        const threadPath = path.join(threadsDir, entry);
        const stat = await deps.fs.stat(threadPath);
        if (stat.isDirectory() && entry !== '_archive') {
            try {
                const thread = await deps.loadThread(entry);
                list.push({ id: entry, status: getThreadStatus(thread) });
            } catch {
                list.push({ id: entry, status: 'INVALID' });
            }
        }
    }

    return { list };
}