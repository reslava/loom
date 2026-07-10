import { DocumentType } from './entities/base';

export interface DocumentEntry {
    path: string;
    type: DocumentType;
    exists: boolean;
    archived: boolean;
    threadSlug?: string;
}

export interface StepBlocker {
    step: number;
    blockedBy: string[];
}

export interface LinkIndex {
    // -----------------------------------------------------------------------
    // Primary index — id (ULID or semantic) → DocumentEntry (path + metadata)
    // -----------------------------------------------------------------------
    documents: Map<string, DocumentEntry>;

    // -----------------------------------------------------------------------
    // New identity indexes (step 3 additions)
    // -----------------------------------------------------------------------
    /** id → absolute file path. Covers all doc types. */
    byId: Map<string, string>;
    /** slug → id. Reference docs only. */
    bySlug: Map<string, string>;
    /** id → list of doc ids that reference it via parent_id or requires_load. */
    backlinks: Map<string, string[]>;

    // -----------------------------------------------------------------------
    // Relationship indexes (legacy — populated from parent_id, not child_ids)
    // -----------------------------------------------------------------------
    children: Map<string, Set<string>>;
    parent: Map<string, string>;

    // -----------------------------------------------------------------------
    // Plan-specific
    // -----------------------------------------------------------------------
    stepBlockers: Map<string, StepBlocker[]>;
}

export function createEmptyIndex(): LinkIndex {
    return {
        documents:   new Map(),
        byId:        new Map(),
        bySlug:      new Map(),
        backlinks:   new Map(),
        children:    new Map(),
        parent:      new Map(),
        stepBlockers: new Map(),
    };
}

/**
 * Resolves a doc reference that may be either a ULID id or a slug (refs only).
 * Returns the canonical id, or null if not found.
 */
export function resolveId(index: LinkIndex, idOrSlug: string): string | null {
    if (index.byId.has(idOrSlug)) return idOrSlug;
    const viaSlug = index.bySlug.get(idOrSlug);
    if (viaSlug) return viaSlug;
    // Fall back to the legacy documents map for semantic ids not yet migrated.
    if (index.documents.has(idOrSlug)) return idOrSlug;
    return null;
}
