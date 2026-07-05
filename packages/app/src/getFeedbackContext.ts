import { LoomState } from '../../core/dist/entities/state';
import { buildRoadmap } from '../../core/dist/derived';
import { buildFeedbackUrl, resolveFeedbackRepo, FeedbackContext, FeedbackSnapshot } from '../../core/dist/feedback';

// ---------------------------------------------------------------------------
// getFeedbackContext — assemble everything a feedback entry point needs.
//
// Orchestration only ((input, deps) => result): resolve the target repo (the
// central sink, or an explicit override), gather the non-PII usage snapshot
// from an already-built LoomState, and hand both to the pure core URL builder.
// The delivery layers (CLI, MCP resource, extension) just open the returned url.
// Repo resolution is pure (no git IO), so it's called directly, not injected.
// ---------------------------------------------------------------------------

export interface GetFeedbackContextInput {
    /** Loom version to report — the caller's lockstep package version. */
    loomVersion: string;
    /** Explicit "owner/name" override (e.g. the reslava-loom.feedback.repo setting). */
    repoOverride?: string | null;
}

export interface GetFeedbackContextDeps {
    /** Bound state reader — the caller supplies the fs-wired getState thunk. */
    getState: () => Promise<LoomState>;
    /** os.platform, injected for testability. */
    platform: () => string;
}

export async function getFeedbackContext(
    input: GetFeedbackContextInput,
    deps: GetFeedbackContextDeps,
): Promise<FeedbackContext> {
    const state = await deps.getState();

    const threadCount = state.weaves.reduce((n, w) => n + w.threads.length, 0);
    const donePlanCount = state.weaves.reduce(
        (n, w) => n + w.threads.reduce(
            (m, t) => m + t.plans.filter(p => p.status === 'done').length, 0), 0);

    const snapshot: FeedbackSnapshot = {
        loomVersion: input.loomVersion,
        platform: deps.platform(),
        weaveCount: state.weaves.length,
        threadCount,
        donePlanCount,
        currentRelease: buildRoadmap(state).currentRelease,
    };

    const repo = resolveFeedbackRepo(input.repoOverride);
    return { repo, snapshot, url: buildFeedbackUrl({ repo, snapshot }) };
}
