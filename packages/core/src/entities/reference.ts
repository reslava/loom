import { BaseDoc } from './base';

export type ReferenceStatus = 'active' | 'archived';

/** Auto-load axis for a reference doc. Absent ⇒ treated as 'by-request'. */
export type LoadAxis = 'always' | 'by-request';

export interface ReferenceDoc extends BaseDoc<ReferenceStatus> {
    type: 'reference';
    status: ReferenceStatus;
    /** Stable kebab-case identifier used in requires_load and filenames. */
    slug: string;
    /**
     * Auto-load axis. `always` ⇒ auto-included in matching scope (subject to
     * `load_when`); `by-request` (default when absent) ⇒ only loaded when named
     * in another doc's `requires_load`.
     */
    load?: LoadAxis;
    /**
     * Operation modes this ref is relevant to (e.g. `['design', 'plan']`).
     * Absent or empty ⇒ relevant to all modes. Only filters auto-load of
     * `load: always` refs; never gates `requires_load`.
     */
    load_when?: string[];
}
