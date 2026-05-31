import { DocumentType } from './entities/base';
import { DocumentStatus } from './entities/document';
import { isUlidId, parseDocId } from './idUtils';

/**
 * Base frontmatter fields present in all Loom documents.
 * `child_ids` is removed — it is computed from the backlink index, not stored.
 */
export interface BaseFrontmatter {
    type: DocumentType;
    id: string;
    title: string;
    status: DocumentStatus;
    created: string;
    version: number;
    tags: string[];
    parent_id: string | null;
    requires_load: string[];
    /** Reference docs only. */
    slug?: string;
}

/**
 * Creates the base frontmatter object for a new document.
 */
export function createBaseFrontmatter(
    type: DocumentType,
    id: string,
    title: string,
    parentId: string | null = null
): BaseFrontmatter {
    return {
        type,
        id,
        title,
        status: 'draft',
        created: new Date().toISOString().split('T')[0],
        version: 1,
        tags: [],
        parent_id: parentId,
        requires_load: [],
    };
}

/**
 * Serializes a value for YAML frontmatter.
 * - Arrays become inline: [a, b, c]
 * - Strings are quoted only if they contain special characters
 */
function serializeValue(value: any): string {
    if (Array.isArray(value)) {
        if (value.length === 0) return '[]';
        return `[${value.map(v => serializeValue(v)).join(', ')}]`;
    }

    if (typeof value === 'string') {
        if (/[:#\n]/.test(value) || value.trim() !== value) {
            return `"${value.replace(/"/g, '\\"')}"`;
        }
        return value;
    }

    if (typeof value === 'number' || typeof value === 'boolean') {
        return String(value);
    }

    if (value === null || value === undefined) {
        return 'null';
    }

    return JSON.stringify(value);
}

/**
 * Canonical key order for Loom frontmatter (design section 1).
 * `child_ids` is intentionally absent — it is dropped on every serialize.
 */
const ORDERED_KEYS = [
    'type',
    'id',
    'title',
    'status',
    'created',
    'updated',
    'version',
    'design_version',
    'tags',
    'parent_id',
    'requires_load',
    // reference-doc fields
    'slug',
    'load',
    'load_when',
    // design-specific
    'role',
    'target_release',
    'actual_release',
    // plan-specific
    'target_version',
    'source_version',
    'staled',
    'refined',
];

/**
 * Serializes a Loom frontmatter object into a deterministic YAML string.
 *
 * Enforced invariants:
 * - `child_ids` is always dropped (computed from backlink index, not stored).
 * - `slug` is stripped from any type other than `reference`.
 * - If `id` is a ULID id, its prefix must match `type` (ctx is exempt).
 */
export function serializeFrontmatter(obj: Record<string, any>): string {
    // Drop child_ids unconditionally.
    const { child_ids: _dropped, ...rest } = obj;

    // Strip slug from non-reference docs.
    if (rest.type !== 'reference' && 'slug' in rest) {
        const { slug: _slug, ...withoutSlug } = rest;
        Object.assign(rest, withoutSlug);
        delete rest.slug;
    }

    // Validate ULID prefix matches type (ctx exempt — keeps semantic id).
    if (rest.id && rest.type && rest.type !== 'ctx' && isUlidId(rest.id)) {
        const parsed = parseDocId(rest.id);
        if (parsed && parsed.type !== null && parsed.type !== rest.type) {
            throw new Error(
                `ID prefix mismatch: id "${rest.id}" has prefix "${parsed.prefix}" ` +
                `but doc type is "${rest.type}"`
            );
        }
    }

    const presentKeys = new Set(Object.keys(rest));
    const orderedPresent = ORDERED_KEYS.filter(k => presentKeys.has(k));
    const remaining = Object.keys(rest)
        .filter(k => !ORDERED_KEYS.includes(k))
        .sort();
    const keys = [...orderedPresent, ...remaining];

    const lines = keys.map(key => {
        const value = serializeValue(rest[key]);
        return `${key}: ${value}`;
    });

    return `---\n${lines.join('\n')}\n---`;
}
