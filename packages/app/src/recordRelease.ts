import { LoomState } from '../../core/dist/entities/state';
import { WorkflowEvent } from '../../core/dist/events/workflowEvent';
import { buildRoadmap } from '../../core/dist/derived';
import { compareDates } from '../../core/dist/dates';

/**
 * Record the shipped release version onto done plans — the single authoritative
 * carrier of `actual_release`. Two modes share one write (the `RECORD_RELEASE`
 * plan event); they differ only in *which plans* and *which version*:
 *
 *  - `recordRelease` (live): stamp every done plan whose `actual_release` is null
 *    with the given version. Between two releases only the newly-shipped plans are
 *    unstamped, so this is the correct auto-detect. Idempotent — a re-run finds
 *    nothing unstamped and is a no-op.
 *  - `backfillReleases`: assign each done plan, by its done-date, to the version
 *    whose `(prevDate, date]` range covers it — from a `{version → date}` map the
 *    caller supplies (the pipeline knows git; core never reads it).
 *
 * Both refuse to overwrite an existing stamp unless `overwrite` is set — that is
 * the deliberate correction path, never the default.
 */

export interface RecordReleaseDeps {
    /** Load the full Loom state (all weaves). */
    loadState: () => Promise<LoomState>;
    /** Run a workflow event against a weave (load → reduce → save). */
    runEvent: (weaveSlug: string, event: WorkflowEvent) => Promise<unknown>;
}

export interface StampedPlan {
    planId: string;
    threadSlug: string;
    weaveSlug: string;
    release: string;
}

export interface SkippedPlan {
    planId: string;
    /** `already-stamped` (has a release, no overwrite) or `unshipped` (done after the last known release). */
    reason: 'already-stamped' | 'unshipped';
}

export interface RecordReleaseResult {
    stamped: StampedPlan[];
    skipped: SkippedPlan[];
}

export interface RecordReleaseInput {
    /** The release version being recorded (e.g. "1.9.3"). */
    version: string;
    /** Re-stamp plans that already carry a release. Default false. */
    overwrite?: boolean;
}

export interface ReleaseDate {
    version: string;
    /** The release's tag date (YYYY-MM-DD). */
    date: string;
}

export interface BackfillReleasesInput {
    /** Version → tag-date map supplied by the caller (built from git on the pipeline side). */
    releaseDates: ReleaseDate[];
    /** Re-stamp plans that already carry a release. Default false. */
    overwrite?: boolean;
}

function recordReleaseEvent(planId: string, release: string): WorkflowEvent {
    return { type: 'RECORD_RELEASE', planId, release } as WorkflowEvent;
}

/** Live mode — stamp `version` onto every unstamped done plan. */
export async function recordRelease(
    input: RecordReleaseInput,
    deps: RecordReleaseDeps
): Promise<RecordReleaseResult> {
    if (!input.version || !input.version.trim()) {
        throw new Error('recordRelease requires a non-empty version.');
    }
    const state = await deps.loadState();
    const { history } = buildRoadmap(state); // done plans only, with weaveSlug/threadSlug/date/release

    const stamped: StampedPlan[] = [];
    const skipped: SkippedPlan[] = [];
    for (const sp of history) {
        if (sp.release != null && !input.overwrite) {
            skipped.push({ planId: sp.planId, reason: 'already-stamped' });
            continue;
        }
        await deps.runEvent(sp.weaveSlug, recordReleaseEvent(sp.planId, input.version));
        stamped.push({ planId: sp.planId, threadSlug: sp.threadSlug, weaveSlug: sp.weaveSlug, release: input.version });
    }
    return { stamped, skipped };
}

/**
 * The version a plan done on `date` belongs to: the earliest release tagged on or
 * after that date — i.e. the release whose `(prevReleaseDate, thisReleaseDate]`
 * window contains the done-date. A plan done after the last known release is
 * unshipped (returns null).
 */
function versionForDate(date: string, ascendingByDate: ReleaseDate[]): string | null {
    for (const r of ascendingByDate) {
        if (compareDates(date, r.date) <= 0) return r.version;
    }
    return null;
}

/** Backfill mode — assign each done plan to its release by done-date. */
export async function backfillReleases(
    input: BackfillReleasesInput,
    deps: RecordReleaseDeps
): Promise<RecordReleaseResult> {
    const ascending = [...(input.releaseDates ?? [])].sort((a, b) => compareDates(a.date, b.date));
    const state = await deps.loadState();
    const { history } = buildRoadmap(state);

    const stamped: StampedPlan[] = [];
    const skipped: SkippedPlan[] = [];
    for (const sp of history) {
        if (sp.release != null && !input.overwrite) {
            skipped.push({ planId: sp.planId, reason: 'already-stamped' });
            continue;
        }
        const version = versionForDate(sp.date, ascending);
        if (!version) {
            skipped.push({ planId: sp.planId, reason: 'unshipped' });
            continue;
        }
        await deps.runEvent(sp.weaveSlug, recordReleaseEvent(sp.planId, version));
        stamped.push({ planId: sp.planId, threadSlug: sp.threadSlug, weaveSlug: sp.weaveSlug, release: version });
    }
    return { stamped, skipped };
}
