import { DocumentType } from './entities/base';
import { DocumentStatus } from './entities/document';
import { PlanStep, StepStatus } from './entities/plan';
import { isUlidId, parseDocId } from './idUtils';
import { today, toCanonical } from './dates';

/** Frontmatter keys that hold a Loom date and are normalized to canonical YYYY-MM-DD on write. */
const DATE_KEYS = new Set(['created', 'updated']);

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
        created: today(),
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
function quoteYaml(value: string): string {
    return `"${value.replace(/\\/g, '\\\\').replace(/"/g, '\\"')}"`;
}

// A YAML plain scalar may not BEGIN with an indicator character (backtick and @ are
// reserved indicators — a value like "`app/foo` use-case" must be quoted).
const YAML_INDICATOR_START = /^[-?:,[\]{}#&*!|>'"%@`]/;

// A plain scalar that YAML would parse back as a NON-string (number, boolean, null).
// Such a string must be quoted so it round-trips as a string — e.g. a title "123"
// written unquoted (`title: 123`) reparses as the number 123, which then crashes the
// VS Code tree ("invalid tree item", label must be a string). Matches js-yaml's
// default schema: decimal/hex/octal/float/scientific numbers, true/false (any case),
// and null / ~.
const YAML_COERCIBLE_SCALAR = /^(?:[-+]?(?:0x[0-9a-f]+|0o[0-7]+|\d[\d_]*\.?\d*|\.\d+)(?:[eE][-+]?\d+)?|true|false|null|~)$/i;

/**
 * Block-scalar context (`key: value`): quote on structural chars, surrounding
 * whitespace, a leading indicator, or when the value would otherwise round-trip as
 * a non-string scalar. Commas/brackets mid-value are safe here.
 */
function needsBlockQuote(v: string): boolean {
    return v === '' || /[:#\n]/.test(v) || v.trim() !== v || YAML_INDICATOR_START.test(v) || YAML_COERCIBLE_SCALAR.test(v);
}

/**
 * Flow context (inside an inline `[a, b]` sequence): also avoid flow-collection
 * punctuation and indicator chars ANYWHERE in the item. Without this, an array entry
 * containing ", ", ": ", brackets, or a backtick (e.g. a `files_touched` cell carrying
 * prose) produces invalid YAML — exactly how a legacy plan migration broke on save.
 */
function needsFlowQuote(v: string): boolean {
    return needsBlockQuote(v) || /[,[\]{}&*!?|>'"%@`]/.test(v);
}

function serializeFlowItem(v: any): string {
    if (typeof v === 'string') return needsFlowQuote(v) ? quoteYaml(v) : v;
    return serializeValue(v);
}

function serializeValue(value: any): string {
    if (Array.isArray(value)) {
        if (value.length === 0) return '[]';
        return `[${value.map(serializeFlowItem).join(', ')}]`;
    }

    if (typeof value === 'string') {
        return needsBlockQuote(value) ? quoteYaml(value) : value;
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
    'idea_version',
    'design_version',
    'req_version',
    'tags',
    'parent_id',
    'requires_load',
    // thread-manifest fields
    'priority',
    'depends_on',
    // reference-doc fields
    'slug',
    'load',
    'load_when',
    // design-specific
    'role',
    // plan-specific
    'target_version',
    'source_version',
    'staled',
    'refined',
    'actual_release',
    'steps',
    // chat-specific
    'last_ai_block',
    // ctx-specific
    'source_hash',
    // report-specific (snapshot artifacts; see loom/ai-integration/loom-ai-analysis)
    'kind',
    'generated_at',
];

// The structured step fields persisted to frontmatter (snake_case, the canonical
// store). title/detail are intentionally NOT persisted — they live as authored
// prose in the body (Goal / `### Step N` sections / Notes), never duplicated here.
const VALID_STEP_STATUSES: StepStatus[] = ['pending', 'in_progress', 'done', 'cancelled'];

/**
 * Serializes a plan's `steps` as a readable block-style YAML sequence. This is the
 * canonical persisted form (source of truth); the body table is a generated view.
 * In-memory `blockedBy` maps to the snake_case `blocked_by` key here — the one field
 * that differs; everything else is 1:1. `parseFrontmatterSteps` is its inverse and
 * the round-trip is asserted in tests.
 */
export function serializeStepsBlock(steps: PlanStep[]): string {
    if (!steps || steps.length === 0) return 'steps: []';
    const lines: string[] = ['steps:'];
    for (const s of steps) {
        lines.push(`  - id: ${serializeValue(s.id)}`);
        lines.push(`    order: ${serializeValue(s.order)}`);
        lines.push(`    status: ${serializeValue(s.status)}`);
        lines.push(`    description: ${serializeValue(s.description)}`);
        lines.push(`    files_touched: ${serializeValue(s.files_touched ?? [])}`);
        lines.push(`    blocked_by: ${serializeValue(s.blockedBy ?? [])}`);
        lines.push(`    satisfies: ${serializeValue(s.satisfies ?? [])}`);
    }
    return lines.join('\n');
}

/**
 * Normalizes raw `steps` parsed from frontmatter YAML (gray-matter gives plain
 * objects with snake_case keys) into in-memory `PlanStep`s. Maps `blocked_by` →
 * `blockedBy`, defaults missing fields, and synthesizes `title` from `description`
 * (title/detail are body-only, so they are not read back from frontmatter).
 */
export function parseFrontmatterSteps(raw: any): PlanStep[] {
    if (!Array.isArray(raw)) return [];
    return raw.map((s: any, i: number): PlanStep => {
        const description = String(s?.description ?? '');
        const status: StepStatus = VALID_STEP_STATUSES.includes(s?.status) ? s.status : 'pending';
        const blockedByRaw = s?.blocked_by ?? s?.blockedBy ?? [];
        return {
            id: String(s?.id ?? `step-${i + 1}`),
            order: typeof s?.order === 'number' ? s.order : i + 1,
            status,
            title: description,
            description,
            files_touched: Array.isArray(s?.files_touched) ? s.files_touched.map(String) : [],
            blockedBy: Array.isArray(blockedByRaw) ? blockedByRaw.map(String) : [],
            satisfies: Array.isArray(s?.satisfies) ? s.satisfies.map(String) : [],
        };
    });
}

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
        // Plan steps serialize as a block-style YAML sequence, not an inline value.
        if (key === 'steps' && Array.isArray(rest[key])) {
            return serializeStepsBlock(rest[key]);
        }
        // Known date keys are normalized to canonical YYYY-MM-DD on write — handling
        // both strings and Date objects (gray-matter parses unquoted dates as Dates).
        // This makes writes self-heal to canonical and breaks the load→save drift that
        // otherwise turns a date-only stamp into a full-ISO timestamp.
        const raw = DATE_KEYS.has(key) ? toCanonical(rest[key]) : rest[key];
        const value = serializeValue(raw);
        return `${key}: ${value}`;
    });

    return `---\n${lines.join('\n')}\n---`;
}
