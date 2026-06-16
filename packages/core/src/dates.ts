/**
 * The single owner of date production, comparison, and canonicalization in Loom.
 *
 * Loom's derived state leans on frontmatter dates (`created` / `updated`): the
 * roadmap History orders shipped plans by date, and staleness compares a parent's
 * `updated` against a child's date. Those derivations are only trustworthy if a
 * date written one way and a date written another way still compare correctly.
 *
 * Historically dates were stamped ad-hoc at a dozen sites (mostly `YYYY-MM-DD`, a
 * few full-ISO) and compared as raw strings — and a raw string compare of
 * `"2026-06-16"` against `"2026-06-16T00:00:00.000Z"` is wrong (the shorter prefix
 * sorts first), which mis-ordered the History view. This module removes that whole
 * class of bug: one canonical on-disk format, one tolerant parser for ordering, and
 * one place to ask for "now".
 *
 * The underlying engine (`Date` today) is an implementation detail no caller names —
 * which is what keeps adopting `Temporal` later a localized swap, touching zero
 * callers, if Loom ever grows a real timezone/calendar/duration need (it does not
 * today: a Loom date is a calendar day with no time and no zone).
 */

/** The canonical Loom date stamp: a calendar day, no time, no zone. `YYYY-MM-DD`. */
export type LoomDate = string;

/** A fully-canonical date stamp matches exactly `YYYY-MM-DD`. */
const CANONICAL_RE = /^\d{4}-\d{2}-\d{2}$/;

/**
 * Today as a canonical `YYYY-MM-DD` stamp. The single source of "now" for every
 * frontmatter `created` / `updated` field — replaces every inline
 * `new Date().toISOString().split('T')[0]`.
 */
export function today(): LoomDate {
    return new Date().toISOString().slice(0, 10);
}

/**
 * The current instant as a full ISO-8601 timestamp. For the few places that want
 * sub-day precision and are NOT a Loom doc date — registry/config entries and
 * "*Generated: …*" body prose. Routed through this module so no `new Date()` lives
 * outside it, without degrading those timestamps to date-only.
 */
export function nowIso(): string {
    return new Date().toISOString();
}

/**
 * Tolerant parse to epoch milliseconds, for ORDERING ONLY. Accepts canonical
 * `YYYY-MM-DD`, full ISO, and any other shape `Date` understands; empty / undefined /
 * unparseable collapse to `-Infinity` so they sort oldest (preserving the prior
 * empty-string-sorts-first behaviour). Because `Date.parse('2026-06-16')` and
 * `Date.parse('2026-06-16T00:00:00.000Z')` are equal, a mixed set of formats — legacy
 * docs, downstream installs, hand-authored dates — orders correctly without any
 * on-disk migration.
 */
export function toEpoch(s: string | Date | undefined | null): number {
    if (s === undefined || s === null || s === '') return -Infinity;
    // gray-matter parses an unquoted `created: 2026-06-09` back as a JS Date, so
    // dates loaded from disk can arrive as Date objects — handle them directly.
    if (isDate(s)) {
        const t = s.getTime();
        return Number.isNaN(t) ? -Infinity : t;
    }
    const ms = Date.parse(String(s));
    return Number.isNaN(ms) ? -Infinity : ms;
}

/** Robust Date check (survives cross-realm objects gray-matter may hand back). */
function isDate(v: unknown): v is Date {
    return v instanceof Date || Object.prototype.toString.call(v) === '[object Date]';
}

/**
 * Chronological comparison of two date strings — the ONLY way Loom orders dates.
 * Returns <0 if `a` is earlier, >0 if later, 0 if equal (including two
 * unparseable/empty values, which both collapse to `-Infinity`). Never returns
 * `NaN` (a naive `toEpoch(a) - toEpoch(b)` would, for `-Infinity - -Infinity`).
 */
export function compareDates(a: string | undefined | null, b: string | undefined | null): number {
    const ea = toEpoch(a);
    const eb = toEpoch(b);
    if (ea < eb) return -1;
    if (ea > eb) return 1;
    return 0;
}

/**
 * Normalize any accepted date string to canonical `YYYY-MM-DD`. Idempotent (an
 * already-canonical value is returned unchanged via a fast path) and safe — an
 * unparseable or empty value is returned untouched rather than corrupted. Used by
 * `serializeFrontmatter` (write-side enforcement) and the `normalize-dates`
 * migration.
 */
export function toCanonical(s: string | Date | undefined | null): string | undefined {
    if (s === undefined || s === null || s === '') return s ?? undefined;
    // A Date (e.g. gray-matter's auto-parse of an unquoted date) canonicalizes to its
    // UTC calendar day — this is what stops the load→save drift to full-ISO.
    if (isDate(s)) {
        const t = s.getTime();
        return Number.isNaN(t) ? undefined : s.toISOString().slice(0, 10);
    }
    if (CANONICAL_RE.test(s)) return s;
    const ms = Date.parse(s);
    if (Number.isNaN(ms)) return s;
    return new Date(ms).toISOString().slice(0, 10);
}
