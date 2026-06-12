import { ParsedReq, ReqItem } from './entities/req';
import { PlanStep } from './entities/plan';

/**
 * Result of checking a plan's scope coverage against a thread's req.
 * This checks **scope traceability through the doc graph** — did the plan
 * faithfully honour the includes/excludes? — NOT functional correctness of
 * the built code.
 */
export interface ReqCoverage {
    /** Included requirements that no plan step cites (dropped scope). */
    uncovered: ReqItem[];
    /** Steps that cite an Excluded id (invented / forbidden scope). */
    excludedViolations: Array<{ stepOrder: number; id: string }>;
    /** Cited ids matching no Included or Constraint id (dangling / typo citations). */
    unknownCitations: Array<{ stepOrder: number; id: string }>;
}

/**
 * Pure deterministic coverage check. No IO, no AI.
 *
 * Rules:
 * - every **active** `Included` id must be cited by ≥1 step (else it's uncovered),
 * - no step may cite an `Excluded` id (a violation),
 * - a citation must resolve to an Included or Constraint id (else it's unknown).
 *
 * Constraints are boundaries, not deliverables — a step *may* cite one but is
 * never *required* to, so constraints never appear in `uncovered`.
 *
 * A `dropped` Included item is retired: it stays a valid citation target (so old
 * `satisfies` references never become `unknownCitations`) but is exempt from the
 * coverage requirement, so it never appears in `uncovered`.
 */
export function checkReqCoverage(req: ParsedReq, steps: PlanStep[]): ReqCoverage {
    const includedIds = new Set(req.included.map(i => i.id));
    const constraintIds = new Set(req.constraints.map(c => c.id));
    const excludedIds = new Set(req.excluded.map(e => e.id));

    const citedIds = new Set<string>();
    const excludedViolations: Array<{ stepOrder: number; id: string }> = [];
    const unknownCitations: Array<{ stepOrder: number; id: string }> = [];

    for (const step of steps) {
        for (const id of step.satisfies ?? []) {
            citedIds.add(id);
            if (excludedIds.has(id)) {
                excludedViolations.push({ stepOrder: step.order, id });
            } else if (!includedIds.has(id) && !constraintIds.has(id)) {
                unknownCitations.push({ stepOrder: step.order, id });
            }
        }
    }

    const uncovered = req.included.filter(i => i.status !== 'dropped' && !citedIds.has(i.id));

    return { uncovered, excludedViolations, unknownCitations };
}

/** True when the plan fully and faithfully honours the req (nothing dropped, invented, or dangling). */
export function isReqSatisfied(coverage: ReqCoverage): boolean {
    return (
        coverage.uncovered.length === 0 &&
        coverage.excludedViolations.length === 0 &&
        coverage.unknownCitations.length === 0
    );
}
