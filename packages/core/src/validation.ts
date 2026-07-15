import { Document } from './entities/document';
import { PlanDoc } from './entities/plan';

import { LinkIndex } from './linkIndex';
import { isPlanIdRef, planRefId } from './planUtils';

export interface ValidationIssue {
    documentId: string;
    severity: 'error' | 'warning';
    message: string;
}

/**
 * Checks whether a document's parent_id exists in the link index.
 */
export function validateParentExists(doc: Document, index: LinkIndex): boolean {
    if (!doc.parent_id) return true;
    const parent = index.documents.get(doc.parent_id);
    if (!parent) return false;
    return parent.exists || parent.archived;
}

/**
 * Returns dangling child references via the backlink index.
 * child_ids is removed from frontmatter; children are derived from parent_id references.
 * This function is now a no-op — kept for API compatibility.
 */
export function getDanglingChildIds(_doc: Document, _index: LinkIndex): string[] {
    return [];
}

/**
 * Validates the step blockers within a plan.
 */
export function validateStepBlockers(plan: PlanDoc, index: LinkIndex): ValidationIssue[] {
    const issues: ValidationIssue[] = [];
    if (!plan.steps) return issues;

    for (const step of plan.steps) {
        if (!step.blockedBy || step.blockedBy.length === 0) continue;

        for (const blocker of step.blockedBy) {
            // Canonical: stable step id referencing another step in this plan.
            if (plan.steps.some(s => s.id === blocker)) continue;

            // Legacy: bare step number "3"
            if (/^\d+$/.test(blocker)) {
                const stepNum = parseInt(blocker, 10);
                if (stepNum < 1 || stepNum > plan.steps.length) {
                    issues.push({
                        documentId: plan.id,
                        severity: 'error',
                        message: `Step ${step.order}: invalid blocker "${blocker}" (no step ${stepNum})`,
                    });
                }
                continue;
            }

            // Canonical: comma-separated step numbers "3,4"
            if (/^\d+(,\s*\d+)*$/.test(blocker)) {
                const stepNums = blocker.split(',').map(s => parseInt(s.trim(), 10));
                for (const stepNum of stepNums) {
                    if (stepNum < 1 || stepNum > plan.steps.length) {
                        issues.push({
                            documentId: plan.id,
                            severity: 'error',
                            message: `Step ${step.order}: invalid blocker "${blocker}" (no step ${stepNum})`,
                        });
                    }
                }
                continue;
            }

            // Cross-plan dependency: a modern `pl_…` ULID, or a legacy
            // "{plan-id}" / "{plan-id} N" / "{plan-id} N,M" form. This is the standing
            // net for warn-and-store (core-engine/cross-plan-blocker-validation): a
            // blocker naming a non-existent plan is stored, never rejected, and surfaced
            // here as a warning — so a dangling `pl_…` edge is never silent (previously
            // a `pl_…` ref fell through to the "unknown blocker format" branch below,
            // both missing the real dangling case and mis-warning on a valid one).
            if (isPlanIdRef(blocker)) {
                const planId = planRefId(blocker);
                const entry = index.documents.get(planId);
                if (!entry || !entry.exists) {
                    issues.push({
                        documentId: plan.id,
                        severity: 'warning',
                        message: `Step ${step.order}: blocked by missing plan "${planId}"`,
                    });
                }
                continue;
            }

            // Unknown blocker format
            issues.push({
                documentId: plan.id,
                severity: 'warning',
                message: `Step ${step.order}: unknown blocker format "${blocker}"`,
            });
        }
    }

    return issues;
}