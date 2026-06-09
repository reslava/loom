import { PlanStep } from '../entities/plan';
import { serializePlanBody, slugifyStepId } from '../planTableUtils';

/**
 * Back-compat shim over the canonical serializer: builds structured steps from a
 * plain description list and delegates to `serializePlanBody`, so create paths that
 * only have step descriptions still emit the one canonical 6-column body. New code
 * should build `PlanStep[]` and call `serializePlanBody` directly.
 */
export function generatePlanBody(_title: string, goal?: string, steps?: string[]): string {
    const taken = new Set<string>();
    const planSteps: PlanStep[] = (steps ?? []).map((s, i) => ({
        id: slugifyStepId(s, taken),
        order: i + 1,
        status: 'pending',
        title: s,
        description: s,
        files_touched: [],
        blockedBy: [],
        satisfies: [],
    }));
    return serializePlanBody(planSteps, { goal });
}
