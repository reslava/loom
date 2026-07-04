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
 * environment snapshot, and the ready-to-open prefilled URL. `repo` and `url`
 * are null when no target repo could be resolved (no override, no git remote).
 */
export interface FeedbackContext {
    /** "owner/name", or null when unresolved. */
    repo: string | null;
    snapshot: FeedbackSnapshot;
    /** Prefilled GitHub issue-form URL, or null when repo is null. */
    url: string | null;
}

/** Issue-form template filename scaffolded by `loom install`. */
export const FEEDBACK_TEMPLATE_FILE = 'feedback.yml';

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
 * Build a prefilled GitHub issue-form URL. Pure. Returns null when `repo` is
 * null so callers surface a "set feedback.repo" message rather than a broken
 * link. GitHub issue *forms* prefill fields by their YAML `id` via
 * `?<field_id>=<value>` (URL-encoded); here the `environment` textarea id must
 * match the scaffolded template, and `template=` targets the form itself.
 */
export function buildFeedbackUrl(params: { repo: string | null; snapshot: FeedbackSnapshot }): string | null {
    if (!params.repo) return null;
    const base = `https://github.com/${params.repo}/issues/new`;
    const query = new URLSearchParams({
        template: FEEDBACK_TEMPLATE_FILE,
        environment: formatFeedbackEnvironment(params.snapshot),
    });
    return `${base}?${query.toString()}`;
}
