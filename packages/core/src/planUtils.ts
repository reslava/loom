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

        // Cross‑plan dependency: a `pl_…` ULID or legacy "{slug}-plan-NNN".
        //
        // Back-compat fallback — no longer the primary contract. "Missing plan ⇒ blocked"
        // used to be the only signal a cross-plan edge pointed nowhere; as of
        // core-engine/cross-plan-blocker-validation the standing `blockedByDangling`
        // diagnostic (loom_validate / loom://diagnostics) is the authoritative surface for
        // a dangling cross-plan edge. This is retained only so a step whose dependency plan
        // does not (yet) exist is not offered as *doable* — mirroring how the ordinal
        // fallback above is kept but no longer load-bearing. Previously only the legacy
        // `-plan-` form was checked here, so a modern `pl_…` blocker was silently ignored
        // (never blocking); `isPlanIdRef` unifies both forms.
        if (isPlanIdRef(blocker)) {
            const planEntry = index.documents.get(planRefId(blocker));
            // Missing/nonexistent target ⇒ blocked (best-effort; the diagnostic reports why).
            // An existing plan is assumed NOT blocked — its completion status can't be checked
            // here without loading the doc.
            if (!planEntry || !planEntry.exists) return true;
            continue;
        }
    }

    return false;
}

/**
 * Whether a `blockedBy` entry names a *plan* (cross-plan dependency) rather than a
 * sibling step: a canonical `pl_…` ULID, or a legacy positional `"{slug}-plan-NNN"`
 * id. Such entries are stored verbatim by {@link resolveBlockedByIds}; whether the
 * target plan actually exists is checked (warn-and-store) via the injected
 * `planExists` predicate, when one is supplied.
 */
export function isPlanIdRef(entry: string): boolean {
    return entry.startsWith('pl_') || entry.includes('-plan-');
}

/**
 * Extract the plan id from a cross-plan `blockedBy` entry. A modern `pl_…` ULID is
 * the id itself; a legacy `"{slug}-plan-NNN N"` form carries a trailing step ordinal
 * separated by a space, so the id is the first token. Use before an existence lookup.
 */
export function planRefId(entry: string): string {
    return entry.includes('-plan-') ? entry.split(' ')[0] : entry;
}

/**
 * A non-blocking advisory produced by {@link resolveBlockedByIds} at write time.
 * `dangling_plan_ref` = a cross-plan `blockedBy` names a plan the injected
 * `planExists` predicate could not resolve. The edge is **still stored** (warn-and-store:
 * forward-referencing a not-yet-created plan is legal) — this only surfaces it so the
 * author isn't left with a silently-dangling edge. The durable guarantee is the standing
 * step-level `dangling_dep` diagnostic; this advisory is the cheap write-time echo.
 */
export interface BlockedByWarning {
    kind: 'dangling_plan_ref';
    /** The unresolved cross-plan ref, as stored. */
    ref: string;
    /** The owning step's id, when known. */
    stepId?: string;
}

/** The result of {@link resolveBlockedByIds}: the normalized edge ids plus any advisories. */
export interface ResolveBlockedByResult {
    ids: string[];
    warnings: BlockedByWarning[];
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
 * - A plan id (`pl_…`, or a legacy `"{slug}-plan-NNN"` cross-plan blocker) is stored
 *   verbatim. If a `planExists` predicate is supplied and it does not resolve the ref,
 *   the edge is **still stored** but a `dangling_plan_ref` warning is returned
 *   (warn-and-store — forward-referencing a not-yet-created plan is legal). Without a
 *   predicate it passes through best-effort, as before. The predicate is the plan-existence
 *   (and legacy-form normalization) oracle: `core` holds no link index, so the caller
 *   closes over it and hands in a pure `(ref) => boolean` — keeping this function pure.
 * - A non-numeric entry that matches a known id in `orderedStepIds` passes through.
 * - A numeric entry out of range, OR a non-numeric entry that is neither a plan id
 *   nor a known step id, throws: a positional reference to a nonexistent step, or a
 *   well-formed but unknown slug (the `"s1"` guess), can only be a mistake — and
 *   persisting it would create a silent dangling edge, exactly what this normaliser
 *   exists to prevent.
 * - The result is de-duplicated (first occurrence wins), so an ordinal and the
 *   slug it resolves to collapse to one edge. An entry that resolves to `selfId`
 *   (a step blocking itself) throws.
 *
 * @param entries        the raw `blockedBy` list as supplied
 * @param orderedStepIds the plan's step ids in order (index 0 = step 1)
 * @param selfId         the owning step's id, when known — to reject self-blocks
 * @param planExists     optional pure predicate — `true` iff the cross-plan ref resolves
 *                       to a real plan. Supplied only by callers that hold the link index
 *                       (the app layer); omitted by the pure reducer, which stores verbatim.
 */
export function resolveBlockedByIds(
    entries: ReadonlyArray<string | number> | undefined,
    orderedStepIds: string[],
    selfId?: string,
    planExists?: (ref: string) => boolean
): ResolveBlockedByResult {
    if (!entries || entries.length === 0) return { ids: [], warnings: [] };

    const resolved: string[] = [];
    const warnings: BlockedByWarning[] = [];
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

        let id: string;
        let danglingPlanRef = false;
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
        } else if (isPlanIdRef(entry)) {
            // Cross-plan blocker: always stored verbatim (warn-and-store). The resolver
            // holds no link index, so plan-existence is checked via the injected predicate
            // (which also resolves the legacy "{slug}-plan-NNN" form). When a predicate is
            // supplied and the ref does not resolve, the edge is kept AND flagged as a
            // dangling_plan_ref advisory. Without a predicate this stays best-effort.
            id = entry;
            if (planExists && !planExists(entry)) danglingPlanRef = true;
        } else if (orderedStepIds.includes(entry)) {
            // An already-resolved step-id slug — passes through.
            id = entry;
        } else {
            // A well-formed string that is neither an ordinal, a plan id, nor a known
            // step id. This is the "s1" guess: previously it passed through and persisted
            // as a *dangling* edge. Refuse it loudly — no dependency edge is lost silently.
            throw new Error(
                `blockedBy references unknown step id ${JSON.stringify(entry)}. ` +
                `Valid step ids: ${orderedStepIds.map(s => JSON.stringify(s)).join(', ') || '(none)'}. ` +
                `To reference a sibling step by position, use its 1-based ordinal ` +
                `(e.g. "1" for the first step); for a cross-plan dependency use the target plan's pl_… id.`
            );
        }

        if (selfId !== undefined && id === selfId) {
            throw new Error(`A step cannot block itself (blockedBy resolves to its own id "${id}").`);
        }

        if (!seen.has(id)) {
            seen.add(id);
            resolved.push(id);
            // Warn once per unique unresolved edge (dedupe collapses repeats of the same ref).
            if (danglingPlanRef) warnings.push({ kind: 'dangling_plan_ref', ref: id, stepId: selfId });
        }
    }

    return { ids: resolved, warnings };
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