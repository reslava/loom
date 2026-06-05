import { ulid } from 'ulid';
import type { DocumentType } from './entities/base';

// ---------------------------------------------------------------------------
// ULID-based identity
// ---------------------------------------------------------------------------

const TYPE_PREFIX: Record<DocumentType, string> = {
    chat:      'ch_',
    idea:      'id_',
    design:    'de_',
    plan:      'pl_',
    done:      'dn_',
    ctx:       'cx_',
    reference: 'rf_',
    req:       'rq_',
};

const ULID_PATTERN = /^([a-z]{2}_)([0-9A-Z]{26})$/;

/**
 * Generates a ULID-based doc identity for the given type.
 * Returns `{prefix}{ulid}`, e.g. `pl_01JT8Y3R4P7M6K2N9D5QF8A1BC`.
 * Ctx docs are excluded — they keep a semantic id (`*-ctx`). Calling this
 * for `ctx` is allowed but callers should prefer the semantic id convention.
 */
export function generateDocId(type: DocumentType): string {
    return `${TYPE_PREFIX[type]}${ulid()}`;
}

export interface ParsedDocId {
    prefix: string;
    type: DocumentType | null;
    ulid: string;
}

/**
 * Parses a ULID doc id into its prefix, inferred type, and raw ULID.
 * Returns null if `id` does not match the `{2-char-prefix}_{26-char-ulid}` shape.
 */
export function parseDocId(id: string): ParsedDocId | null {
    const m = id.match(ULID_PATTERN);
    if (!m) return null;
    const prefix = m[1];
    const rawUlid = m[2];
    const type = (Object.entries(TYPE_PREFIX).find(([, p]) => p === prefix)?.[0] as DocumentType) ?? null;
    return { prefix, type, ulid: rawUlid };
}

/** Returns true if `id` matches the `{2-char-prefix}_{26-char-ulid}` shape. */
export function isUlidId(id: string): boolean {
    return ULID_PATTERN.test(id);
}

// ---------------------------------------------------------------------------
// Slug-based / legacy identity
// ---------------------------------------------------------------------------

/**
 * Converts any string to a kebab-case ID.
 * Example: "Add Dark Mode!" -> "add-dark-mode"
 */
export function toKebabCaseId(title: string): string {
    return title
        .toLowerCase()
        .replace(/[^\w\s-]/g, '')
        .trim()
        .replace(/\s+/g, '-')
        .replace(/-+/g, '-');
}

/**
 * Ensures the generated ID is unique within the existing set.
 * If the base ID already exists, appends a numeric suffix.
 */
export function ensureUniqueId(baseId: string, existingIds: Set<string>): string {
    if (!existingIds.has(baseId)) {
        return baseId;
    }
    let counter = 2;
    let candidate = `${baseId}-${counter}`;
    while (existingIds.has(candidate)) {
        counter++;
        candidate = `${baseId}-${counter}`;
    }
    return candidate;
}

/**
 * Generates a permanent ID from a title and document type.
 * Format: {kebab-title}-{type}
 */
export function generatePermanentId(title: string, type: string, existingIds: Set<string>): string {
    const baseId = `${toKebabCaseId(title)}-${type}`;
    return ensureUniqueId(baseId, existingIds);
}

/**
 * Generates the next available plan ID, scoped by the caller's chosen prefix.
 * Format: {scope}-plan-{###} — scope is the threadId for threaded plans
 * (and the weaveId for loose plans at weave root). Counter is local to whatever
 * existingPlanIds the caller passes; pass thread-local IDs to get thread-local
 * numbering. Use resolveWeaveIdForPlan to recover the containing weave from a
 * planId — never split('-plan-')[0], that assumed weaveId-prefix and is wrong.
 */
export function generatePlanId(scope: string, existingPlanIds: string[]): string {
    const prefix = `${scope}-plan-`;
    const numbers = existingPlanIds
        .map(p => p.match(/-plan-(\d+)$/)?.[1])
        .filter(Boolean)
        .map(Number);
    const next = numbers.length > 0 ? Math.max(...numbers) + 1 : 1;
    return `${prefix}${String(next).padStart(3, '0')}`;
}

/**
 * Generates the next available chat ID for a weave.
 * Format: {weaveId}-chat-{###}
 */
export function generateChatId(weaveId: string, existingChatIds: string[]): string {
    const prefix = `${weaveId}-chat-`;
    const numbers = existingChatIds
        .map(id => id.match(/-chat-(\d+)$/)?.[1])
        .filter(Boolean)
        .map(Number);
    const next = numbers.length > 0 ? Math.max(...numbers) + 1 : 1;
    return `${prefix}${String(next).padStart(3, '0')}`;
}