import { execSync } from 'child_process';

// ---------------------------------------------------------------------------
// Feedback target-repo resolution (IO).
//
// The reuse hinge: feedback must land in the *current* project's repo, not a
// hardcoded one, so the same command works in loom, chord-flow, or any repo
// where Loom is installed. Resolution order is override → git `origin` → null.
// The parse is a pure, testable helper; only the git read touches the world.
// ---------------------------------------------------------------------------

/**
 * Parse a git remote URL into "owner/name", or null when it is not a
 * GitHub-style URL. Handles the three common forms:
 *   https://github.com/owner/name(.git)
 *   git@github.com:owner/name(.git)
 *   ssh://git@github.com/owner/name(.git)
 */
export function parseGitHubRepo(remoteUrl: string): string | null {
    const match = remoteUrl.trim().match(/github\.com[/:]([^/]+)\/(.+?)(?:\.git)?$/i);
    return match ? `${match[1]}/${match[2]}` : null;
}

export interface ResolveFeedbackRepoOptions {
    /** Explicit "owner/name" override (e.g. the reslava-loom.feedback.repo setting). */
    override?: string | null;
    /** Directory to read the git remote from. Defaults to process.cwd(). */
    cwd?: string;
}

/**
 * Resolve the feedback target repo: config override → git `origin` remote → null.
 *
 * No hardcoded reslava/loom fallback — in the Loom repo the origin remote already
 * resolves to reslava/loom, so the self-case needs no special-casing, and a
 * foreign repo with no override and no GitHub remote correctly yields null (the
 * caller then prompts the user to set feedback.repo rather than guessing).
 */
export function resolveFeedbackRepo(opts: ResolveFeedbackRepoOptions = {}): string | null {
    const override = opts.override?.trim();
    if (override) return override;
    try {
        const remote = execSync('git remote get-url origin', {
            cwd: opts.cwd ?? process.cwd(),
            stdio: ['ignore', 'pipe', 'ignore'],
            encoding: 'utf8',
        });
        return parseGitHubRepo(remote);
    } catch {
        return null;
    }
}
