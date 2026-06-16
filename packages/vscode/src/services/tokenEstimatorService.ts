/**
 * Formats token counts for the context sidebar. Token *estimates* are computed
 * server-side and arrive in the context bundle (`bundle.docs[].tokenEstimate`,
 * `bundle.totalTokens`); this service only renders them, so it no longer reads
 * files from disk (the old fs-backed `estimateFromFile` was dead code).
 */
export class TokenEstimatorService {
    format(tokens: number): string {
        return tokens >= 1000 ? `~${(tokens / 1000).toFixed(1)}k` : `~${tokens}`;
    }
}
