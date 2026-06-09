import { PlanDoc } from '../entities/plan';
import { LinkIndex } from '../linkIndex';
import { isStepBlocked } from '../planUtils';

/**
 * Filters an array of plans by their staleness flag.
 *
 * @param plans - The array of plans to filter.
 * @param staled - If true, returns only stale plans; if false, returns only non‑stale plans.
 * @returns A new array containing only plans matching the staleness criteria.
 */
export function filterPlansByStaleness(plans: PlanDoc[], staled: boolean): PlanDoc[] {
    return plans.filter(p => (p.staled ?? false) === staled);
}

/**
 * Filters an array of plans by their target release version.
 *
 * @param plans - The array of plans to filter.
 * @param version - The target version string to match exactly.
 * @returns A new array containing only plans with the given target version.
 */
export function filterPlansByTargetVersion(plans: PlanDoc[], version: string): PlanDoc[] {
    return plans.filter(p => p.target_version === version);
}

/**
 * Filters an array of plans to only those that contain at least one genuinely blocked step.
 *
 * @param plans - The array of plans to filter.
 * @param index - The link index for resolving blockers.
 * @returns A new array containing only plans that have one or more blocked steps.
 */
export function filterPlansWithBlockedSteps(plans: PlanDoc[], index: LinkIndex): PlanDoc[] {
    return plans.filter(p => {
        if (!p.steps) return false;
        return p.steps.some(s => s.status !== 'done' && s.status !== 'cancelled' && isStepBlocked(s, p, index));
    });
}