import { BaseDoc } from './base';

export type IdeaStatus = 'draft' | 'active' | 'done' | 'cancelled';

export interface IdeaDoc extends BaseDoc<IdeaStatus> {
    type: 'idea';
    status: IdeaStatus;
    /** Locked req version this doc was last built against (req-staleness baseline). */
    req_version?: number;
}