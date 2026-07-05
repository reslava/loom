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
 * The feedback sink — the sole target. EVERY Loom install (this repo, any
 * end-user project) files feedback into the Loom project's issues, full stop.
 * There is intentionally no override: a user must never be able to point Loom
 * feedback at their own repo, where it would be noise to them and invisible to
 * the maintainer. Reusing this mechanism in a non-Loom tool means changing this
 * constant, nothing else.
 */
export const FEEDBACK_REPO = 'reslava/loom';

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
