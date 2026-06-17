import { BaseDoc } from './base';

export type DesignStatus = 'draft' | 'active' | 'closed' | 'done' | 'cancelled';

export interface DesignDoc extends BaseDoc<DesignStatus> {
    type: 'design';
    status: DesignStatus;
    refined?: boolean;
    /** Locked req version this doc was last built against (req-staleness baseline). */
    req_version?: number;
}