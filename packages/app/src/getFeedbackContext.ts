import { LoomState } from '../../core/dist/entities/state';
import { buildRoadmap } from '../../core/dist/derived';
import { buildFeedbackUrl, FEEDBACK_REPO, FeedbackContext, FeedbackSnapshot } from '../../core/dist/feedback';

// ---------------------------------------------------------------------------
// getFeedbackContext — assemble everything a feedback entry point needs.
//
// Orchestration only ((input, deps) => result): gather the non-PII usage
// snapshot from an already-built LoomState and hand it to the pure core URL
// builder targeting the fixed feedback sink. The delivery layers (CLI, MCP
// resource, extension) just open the returned url.
// ---------------------------------------------------------------------------

export interface GetFeedbackContextInput {
    /** Loom version to report — the caller's lockstep package version. */
    loomVersion: string;
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

    return { repo: FEEDBACK_REPO, snapshot, url: buildFeedbackUrl({ repo: FEEDBACK_REPO, snapshot }) };
}
