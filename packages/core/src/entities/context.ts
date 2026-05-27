import { DocumentType } from './base';

/**
 * Operation mode for a context-assembly request. Derived explicitly from the
 * command that launches the AI (see context-pipeline design §8). Drives the
 * load_when filter (Phase 2).
 */
export type OperationMode =
    | 'chat'
    | 'idea'
    | 'design'
    | 'plan'
    | 'implementing'
    | 'refine'
    | 'promote'
    | 'ctx';

/** Where a bundled doc sits relative to the target — derived positionally from LoomState. */
export type DocScope = 'global' | 'weave' | 'thread' | 'target';

/** Why a doc made it into the bundle. */
export type EmitReason = 'auto' | 'requires_load' | 'user-include' | 'user-exclude-overridden';

/** Why a doc was kept out of the bundle. */
export type ExcludeReason = 'user-exclude' | 'load_when-filter' | 'stale-skip' | 'budget' | 'missing';

/** User overrides from the sidebar CONTEXT section (Phase 3). Empty in Phase 1. */
export interface ContextOverrides {
    include: string[];
    exclude: string[];
}

/** A single document included in a ContextBundle, with full provenance. */
export interface BundledDoc {
    id: string;
    title: string;
    type: DocumentType;
    scope: DocScope;
    reason: EmitReason;
    /** Raw markdown body (verbatim from BaseDoc.content). Empty for a missing placeholder. */
    content: string;
    tokenEstimate: number;
    /** Present only when the doc is flagged stale relative to a parent. */
    stale?: { reason: string };
    /** True when this is a placeholder for a requires_load target that does not exist. */
    missing?: true;
}

/** A document deliberately excluded from the bundle, with a reason code. */
export interface ExcludedDoc {
    id: string;
    reason: ExcludeReason;
}

/**
 * The deterministic output of the context assembler: the single source of truth
 * for prompt injection, visibility output, and the sidebar CONTEXT marks.
 * `docs` is ordered; serialisation and visibility both walk it in order.
 */
export interface ContextBundle {
    targetId: string;
    mode: OperationMode;
    docs: BundledDoc[];
    excluded: ExcludedDoc[];
    totalTokens: number;
}
