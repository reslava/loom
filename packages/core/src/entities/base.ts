export type DocumentType = 'idea' | 'design' | 'plan' | 'ctx' | 'chat' | 'done' | 'reference' | 'req';

export interface BaseDoc<TStatus extends string = string> {
    /** Discriminator for the document type */
    type: DocumentType;

    /** Unique identifier (kebab‑case, e.g., 'payment-system-design') */
    id: string;

    /** Human‑readable title */
    title: string;

    /** Current workflow status — specific to the document type */
    status: TStatus;

    /** Creation date (YYYY‑MM‑DD) */
    created: string;

    /** Last updated date (YYYY‑MM‑DD), optional */
    updated?: string;

    /** Document version (integer) */
    version: number;

    /** Categorization tags */
    tags: string[];

    /** ID of parent document (null for root) */
    parent_id: string | null;

    /** Documents that must be loaded for AI context */
    requires_load: string[];

    /** Raw Markdown content (excluded from frontmatter serialization) */
    content: string;

    /** Internal: absolute filesystem path (not persisted) */
    _path?: string;
}