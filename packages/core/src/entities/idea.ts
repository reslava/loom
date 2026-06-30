import { BaseDoc } from './base';

export type IdeaStatus = 'draft' | 'active' | 'done' | 'cancelled';

export interface IdeaDoc extends BaseDoc<IdeaStatus> {
    type: 'idea';
    status: IdeaStatus;
    // The idea is the root of the dependency chain — it has no upstream parent and
    // is never stale. See loom/refs/staleness-reference.md.
}