import { PlanDoc } from './entities/plan';
import { LinkIndex } from './linkIndex';

/**
 * Determines whether a plan step is currently blocked.
 *
 * @param step - The step to evaluate.
 * @param plan - The parent plan document.
 * @param index - The link index for resolving cross‑plan dependencies.
 * @returns True if the step is blocked by an incomplete internal step or a missing/incomplete external plan.
 */
export function isStepBlocked(
    step: { order: number; blockedBy: string[] },
    plan: PlanDoc,
    index: LinkIndex
): boolean {
    if (!step.blockedBy || step.blockedBy.length === 0) return false;

    for (const blocker of step.blockedBy) {
        // Internal step dependency by stable id (canonical).
        const byId = plan.steps?.find(s => s.id === blocker);
        if (byId) {
            if (byId.status !== 'done' && byId.status !== 'cancelled') return true;
            continue;
        }

        // Internal step dependency by ordinal "Step N" / "N" (legacy, pre-stable-id).
        const stepMatch = blocker.match(/^(?:Step\s+)?(\d+)$/i);
        if (stepMatch) {
            const stepNum = parseInt(stepMatch[1], 10);
            const targetStep = plan.steps?.find(s => s.order === stepNum);
            if (targetStep && targetStep.status !== 'done' && targetStep.status !== 'cancelled') return true;
            continue;
        }

        // Cross‑plan dependency: plan ID
        if (blocker.includes('-plan-')) {
            const planEntry = index.documents.get(blocker);
            // If the plan doesn't exist or the file is missing, consider it blocked.
            if (!planEntry || !planEntry.exists) return true;
            // If the plan exists, we cannot check its status without loading the document.
            // For now, assume it is NOT blocked (the blocker resolution is best‑effort).
            // A future enhancement could load the plan to check its status.
            continue;
        }
    }

    return false;
}

/**
 * Finds the next unblocked, incomplete step in a plan.
 *
 * @param plan - The plan document to search.
 * @param index - The link index for resolving blockers.
 * @returns The next step, or null if all remaining steps are blocked or complete.
 */
export function findNextStep(
    plan: PlanDoc,
    index: LinkIndex
): { order: number; description: string } | null {
    if (!plan.steps) return null;

    for (const step of plan.steps) {
        if (step.status === 'done' || step.status === 'cancelled') continue;
        if (!isStepBlocked(step, plan, index)) {
            return { order: step.order, description: step.description };
        }
    }

    return null;
}