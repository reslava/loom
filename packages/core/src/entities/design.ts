import { BaseDoc } from './base';

export type DesignStatus = 'draft' | 'active' | 'closed' | 'done' | 'cancelled';

export interface DesignDoc extends BaseDoc<DesignStatus> {
    type: 'design';
    status: DesignStatus;
    refined?: boolean;
    /** Idea version this design was last built/refined against — its staleness
     *  baseline. Stale when `idea_version < idea.version`. See loom/refs/staleness-reference.md. */
    idea_version?: number;
}