// Minimal semantic-version helpers for release ordering. Pure, no IO, no
// dependency — Loom only needs to parse, compare, and take the max of plain
// `X.Y.Z` release strings (e.g. an `actual_release` like "1.9.3"). Prerelease
// and build metadata are intentionally NOT modelled; if that need arises, swap
// in the `semver` package behind this same surface.

export interface SemVer {
    major: number;
    minor: number;
    patch: number;
}

/**
 * Parse a `X.Y.Z` version string (a leading `v` is tolerated and stripped).
 * Returns null for anything that does not start with three dot-separated
 * numeric segments — callers treat null as "no comparable version".
 */
export function parseVersion(v: string | null | undefined): SemVer | null {
    if (typeof v !== 'string') return null;
    const m = v.trim().replace(/^v/i, '').match(/^(\d+)\.(\d+)\.(\d+)/);
    if (!m) return null;
    return { major: Number(m[1]), minor: Number(m[2]), patch: Number(m[3]) };
}

/**
 * Compare two versions: negative if a < b, positive if a > b, 0 if equal.
 * An unparseable version sorts below any parseable one; two unparseable
 * versions compare equal.
 */
export function compareVersions(a: string | null | undefined, b: string | null | undefined): number {
    const pa = parseVersion(a);
    const pb = parseVersion(b);
    if (!pa && !pb) return 0;
    if (!pa) return -1;
    if (!pb) return 1;
    return pa.major - pb.major || pa.minor - pb.minor || pa.patch - pb.patch;
}

/**
 * The greatest parseable version in the list, or null if none parse. Null,
 * undefined, and unparseable entries are skipped.
 */
export function maxVersion(versions: Array<string | null | undefined>): string | null {
    let best: string | null = null;
    for (const v of versions) {
        if (parseVersion(v) === null) continue;
        if (best === null || compareVersions(v, best) > 0) best = v as string;
    }
    return best;
}
