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
 * Normalize a step's `blockedBy` entries to stable step-id slugs (write-time).
 *
 * The write-path counterpart to {@link isStepBlocked}'s read-time ordinal
 * tolerance: rather than *tolerating* a stored ordinal on read, this *resolves*
 * ordinals to ids on write, so a plan never persists a fragile positional
 * reference that silently mis-points after a reorder.
 *
 * - A numeric entry (`"1"`) or `"Step N"` form → the id at that 1-based position
 *   in `orderedStepIds`.
 * - Any other (non-numeric) entry — an already-resolved step-id slug, or a plan
 *   id (`pl_…` / a cross-plan blocker) — passes through unchanged.
 * - A numeric entry with no step at that position (out of range) throws: a
 *   positional reference to a step that doesn't exist can only be a mistake.
 * - The result is de-duplicated (first occurrence wins), so an ordinal and the
 *   slug it resolves to collapse to one edge. An entry that resolves to `selfId`
 *   (a step blocking itself) throws.
 *
 * @param entries        the raw `blockedBy` list as supplied
 * @param orderedStepIds the plan's step ids in order (index 0 = step 1)
 * @param selfId         the owning step's id, when known — to reject self-blocks
 */
export function resolveBlockedByIds(
    entries: ReadonlyArray<string | number> | undefined,
    orderedStepIds: string[],
    selfId?: string
): string[] {
    if (!entries || entries.length === 0) return [];

    const resolved: string[] = [];
    const seen = new Set<string>();

    for (const raw of entries) {
        // Accept a numeric ordinal: a JSON tool-call can deliver `blockedBy: [1]` as a
        // number, not the string "1". Coerce an integer to its string form so the ordinal
        // regex below resolves it identically to "1". Anything that is neither a string
        // nor an integer is a malformed edge — throw, never silently drop it. A silently
        // lost dependency edge is exactly the harm this normalisation exists to prevent.
        let entry: string;
        if (typeof raw === 'string') {
            entry = raw.trim();
        } else if (typeof raw === 'number' && Number.isInteger(raw)) {
            entry = String(raw);
        } else {
            throw new Error(
                `blockedBy entry ${JSON.stringify(raw)} is neither a step id/ordinal string ` +
                `nor an integer ordinal. Pass step ids (slugs), plan ids, or 1-based ordinals.`
            );
        }
        if (entry === '') continue;

        let id = entry;
        const ordinal = entry.match(/^(?:Step\s+)?(\d+)$/i);
        if (ordinal) {
            const position = parseInt(ordinal[1], 10);
            if (position < 1 || position > orderedStepIds.length) {
                throw new Error(
                    `blockedBy references step ordinal "${entry}", but the plan has ` +
                    `${orderedStepIds.length} step(s). Use a valid 1-based position or a step id.`
                );
            }
            id = orderedStepIds[position - 1];
        }

        if (selfId !== undefined && id === selfId) {
            throw new Error(`A step cannot block itself (blockedBy resolves to its own id "${id}").`);
        }

        if (!seen.has(id)) {
            seen.add(id);
            resolved.push(id);
        }
    }

    return resolved;
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