/**
 * Release-notes brief — the pure doc-graph half of `loom report release-notes`.
 *
 * Selects the **Unreleased** set (done plans whose `actual_release` is still null — exactly
 * this-release's contents, the same set `record-release` stamps at the end of a run) and,
 * by default, hydrates each plan's done-doc body so the synthesis has the *why*, not just a
 * title. Pure (no IO): both the MCP `report` prompt and the CLI consume it, and the invoking
 * agent turns the brief into prose — no LLM here. See loom/release-automation/release-notes-report.
 */
import { LoomState } from './entities/state';
import { buildRoadmap } from './derived';

/** One Unreleased shipped plan, optionally carrying its done-doc body (enrichment). */
export interface ReleaseNotesEntry {
    planId: string;
    planTitle: string;
    weaveSlug: string;
    threadSlug: string;
    /** Done-doc `created` (fallback: plan date) — from the roadmap history. */
    date: string;
    /** Done-doc body, present when enrichment is on and a done doc exists. */
    doneBody?: string;
}

/** A thread still mid-implementation — a tell the empty-set guard uses (work not yet closed). */
export interface ImplementingThread {
    weaveSlug: string;
    threadSlug: string;
    title: string;
}

export interface ReleaseNotesBrief {
    /** Unreleased (actual_release == null) done plans, newest first. */
    unreleased: ReleaseNotesEntry[];
    /** Threads still `implementing` — surfaced for the empty-set diagnosis. */
    implementingThreads: ImplementingThread[];
    /** True when there are no unreleased done plans (drives the empty-set guard). */
    isEmpty: boolean;
    /** Whether done-doc bodies were hydrated (enrichment) vs titles-only. */
    enriched: boolean;
}

/**
 * Build the release-notes brief from state. `titlesOnly` skips done-body hydration for a fast,
 * low-token draft; the default hydrates each Unreleased plan's done-doc body. Pure.
 */
export function buildReleaseNotesBrief(
    state: LoomState,
    opts: { titlesOnly?: boolean } = {},
): ReleaseNotesBrief {
    const titlesOnly = opts.titlesOnly === true;
    const { roadmap, history } = buildRoadmap(state);

    // Index done-doc bodies by the plan they record, for hydration.
    const doneBodyByPlan = new Map<string, string>();
    if (!titlesOnly) {
        for (const weave of state.weaves ?? []) {
            for (const thread of weave.threads ?? []) {
                for (const done of thread.dones ?? []) {
                    if (done.parent_id && typeof done.content === 'string') {
                        doneBodyByPlan.set(done.parent_id, done.content);
                    }
                }
            }
        }
    }

    // history is already newest-first; the Unreleased set is release == null.
    const unreleased: ReleaseNotesEntry[] = history
        .filter(h => h.release == null)
        .map(h => ({
            planId: h.planId,
            planTitle: h.planTitle,
            weaveSlug: h.weaveSlug,
            threadSlug: h.threadSlug,
            date: h.date,
            doneBody: titlesOnly ? undefined : doneBodyByPlan.get(h.planId),
        }));

    const implementingThreads: ImplementingThread[] = roadmap
        .filter(n => n.status === 'implementing')
        .map(n => ({ weaveSlug: n.weaveSlug, threadSlug: n.threadSlug, title: n.title }));

    return {
        unreleased,
        implementingThreads,
        isEmpty: unreleased.length === 0,
        enriched: !titlesOnly,
    };
}
