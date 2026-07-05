// ---------------------------------------------------------------------------
// Feedback — pure URL assembly + context types.
//
// PURE: no IO, no side effects. The app layer gathers the raw facts (resolved
// repo, Loom version, OS, usage counts) and this module turns them into the
// prefilled GitHub issue-form URL. Keeping the assembly here means the CLI, the
// MCP resource, and the extension all build the exact same URL from the same
// rules, and the encoding is unit-testable without touching the filesystem.
// ---------------------------------------------------------------------------

/**
 * Non-PII usage snapshot carried in a feedback message. COUNTS ONLY — never doc
 * content, titles, paths, or the repo name. It is what separates "someone
 * installed Loom" from "someone actually completed the workflow loop"; the user
 * always sees and can trim it before sending.
 */
export interface FeedbackSnapshot {
    /** Loom package version, e.g. "1.15.0". */
    loomVersion: string;
    /** os.platform() value, e.g. "win32" | "darwin" | "linux". */
    platform: string;
    weaveCount: number;
    threadCount: number;
    donePlanCount: number;
    /** Derived current release (highest shipped actual_release), or null. */
    currentRelease: string | null;
}

/**
 * Everything the feedback entry points need: the resolved target repo, the
 * environment snapshot, and the ready-to-open prefilled URL. The repo always
 * resolves (to the central sink or an explicit override), so both are non-null.
 */
export interface FeedbackContext {
    /** "owner/name" — the resolved feedback sink. */
    repo: string;
    snapshot: FeedbackSnapshot;
    /** Prefilled GitHub issue-form URL. */
    url: string;
}

/** Issue-form template filename the central sink repo hosts. */
export const FEEDBACK_TEMPLATE_FILE = 'feedback.yml';

/**
 * The canonical feedback sink: EVERY Loom install — this repo, chord-flow, any
 * end-user project — files feedback into the Loom project's issues, so the
 * signal lands where it's acted on. This is deliberately central, not the
 * current project's repo: a user reporting a Loom bug wants the Loom maintainer
 * to see it, not to file it in their own repo where it's lost.
 */
export const DEFAULT_FEEDBACK_REPO = 'reslava/loom';

/**
 * Resolve the feedback target: an explicit override, else the central sink.
 * Pure. The override exists for *code reuse* — a fork or a non-Loom tool built
 * on this mechanism points feedback at its own repo (e.g. via the
 * `reslava-loom.feedback.repo` setting / `--repo` flag). Absent that, feedback
 * always reaches the Loom project; it never depends on the current git remote.
 */
export function resolveFeedbackRepo(override?: string | null): string {
    const o = override?.trim();
    return o ? o : DEFAULT_FEEDBACK_REPO;
}

/**
 * Render the snapshot as the human-readable body of the form's `environment`
 * field. Plain text, one fact per line, non-PII.
 */
export function formatFeedbackEnvironment(s: FeedbackSnapshot): string {
    return [
        `Loom version: ${s.loomVersion}`,
        `OS: ${s.platform}`,
        `Weaves: ${s.weaveCount}`,
        `Threads: ${s.threadCount}`,
        `Done plans: ${s.donePlanCount}`,
        `Current release: ${s.currentRelease ?? 'n/a'}`,
    ].join('\n');
}

/**
 * Build a prefilled GitHub issue-form URL. Pure. GitHub issue *forms* prefill
 * fields by their YAML `id` via `?<field_id>=<value>` (URL-encoded); here the
 * `environment` textarea id must match the sink repo's form, and `template=`
 * targets the form itself.
 */
export function buildFeedbackUrl(params: { repo: string; snapshot: FeedbackSnapshot }): string {
    const base = `https://github.com/${params.repo}/issues/new`;
    const query = new URLSearchParams({
        template: FEEDBACK_TEMPLATE_FILE,
        environment: formatFeedbackEnvironment(params.snapshot),
    });
    return `${base}?${query.toString()}`;
}
