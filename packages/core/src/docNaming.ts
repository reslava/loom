/**
 * Canonical document filename derivation — the SINGLE source of truth for how a
 * Loom doc's on-disk filename is formed. Before this module the logic was spread
 * across ~10 disagreeing sites (per-type create use-cases, the core id generators,
 * and the `docPathInThread` fallback); they are now all routed here.
 *
 * Identity is ALWAYS the frontmatter ULID. Filenames are human-facing presentation
 * and may change freely (rename / migrate) without touching a single cross-reference
 * (`parent_id`, `child_ids`, `requires_load`, `blockedBy`, `depends_on`).
 *
 * New (canonical) scheme — flat, humanised, thread-local:
 *   idea      → idea.md
 *   design    → design.md
 *   plan      → plan-NNN.md          (NNN = zero-padded thread-local ordinal)
 *   done      → plan-NNN-done.md     (mirrors its plan's ordinal)
 *   chat      → chat-NNN.md
 *   req       → req.md
 *   thread    → thread.md
 *   reference → {slug}.md
 *
 * Dual-read (transition strategy A): the recognisers below ALSO match the legacy
 * names ({threadId}-idea.md, {threadId}-design.md, {threadId}-plan-NNN.md,
 * {threadId}-chat-NNN.md, {planId}-done.md) so a repo can be read correctly before
 * `loom migrate-layout` normalises it. Writers always emit the new scheme.
 */

export type OrdinalDocType = 'plan' | 'chat';

// These suffix-anchored patterns match BOTH the new flat names and the legacy
// thread-prefixed names, because the new name is a suffix of the legacy one
// (e.g. `plan-001.md` is the tail of `some-thread-plan-001.md`).
const PLAN_ORDINAL_RE = /plan-(\d+)\.md$/;
const CHAT_ORDINAL_RE = /chat-(\d+)\.md$/;
const DONE_RE = /-done\.md$/;
const IDEA_RE = /(?:^|-)idea\.md$/;
const DESIGN_RE = /(?:^|-)design\.md$/;

/** Zero-pad an ordinal to the canonical 3-digit width (gaps preserved, never renumbered). */
export function formatOrdinal(n: number): string {
    return String(n).padStart(3, '0');
}

/**
 * Next thread-local ordinal for a plan/chat: max existing (legacy OR new) + 1.
 * Deleted ordinals leave gaps — the counter never reuses a number, so a filename
 * stays stable for the life of the doc.
 */
export function nextOrdinal(existingFilenames: string[], type: OrdinalDocType): number {
    const re = type === 'plan' ? PLAN_ORDINAL_RE : CHAT_ORDINAL_RE;
    const nums = existingFilenames
        .map(f => f.match(re)?.[1])
        .filter((x): x is string => Boolean(x))
        .map(Number);
    return nums.length ? Math.max(...nums) + 1 : 1;
}

// --- Canonical (new-scheme) filename writers -------------------------------

export function planFileName(ordinal: number): string {
    return `plan-${formatOrdinal(ordinal)}.md`;
}

export function doneFileName(planOrdinal: number): string {
    return `plan-${formatOrdinal(planOrdinal)}-done.md`;
}

export function chatFileName(ordinal: number): string {
    return `chat-${formatOrdinal(ordinal)}.md`;
}

/** The flat singleton filename for a per-thread doc type, or null if the type is ordinal/slug-named. */
export function singletonFileName(type: 'idea' | 'design' | 'req' | 'thread'): string {
    return `${type === 'thread' ? 'thread' : type}.md`;
}

// --- Dual-read recognisers (filename → doc type) ---------------------------
// Used by directory-scoped scanners; the containing folder (plans/ vs done/ vs
// chats/) further disambiguates legacy done docs that were named like plans.

export function isPlanFile(f: string): boolean {
    return PLAN_ORDINAL_RE.test(f) && !DONE_RE.test(f);
}

export function isDoneFile(f: string): boolean {
    return DONE_RE.test(f);
}

export function isChatFile(f: string): boolean {
    // new: chat-001.md · legacy: foo-chat-001.md / foo-chat.md · bare: chat.md
    return /(?:^|-)chat(?:-\d+)?\.md$/.test(f);
}

export function isIdeaFile(f: string): boolean {
    return IDEA_RE.test(f);
}

export function isDesignFile(f: string): boolean {
    return DESIGN_RE.test(f);
}

/** Extract a plan's ordinal from its filename (legacy or new), or null if absent. */
export function planOrdinalFromFile(filename: string): number | null {
    const m = filename.match(PLAN_ORDINAL_RE);
    return m ? Number(m[1]) : null;
}

/** Extract a chat's ordinal from its filename (legacy or new), or null if absent. */
export function chatOrdinalFromFile(filename: string): number | null {
    const m = filename.match(CHAT_ORDINAL_RE);
    return m ? Number(m[1]) : null;
}
