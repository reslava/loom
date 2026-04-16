export type IdeaStatus =
    | 'draft'
    | 'active'
    | 'done'
    | 'cancelled';

export interface IdeaDoc {
    type: 'idea';
    id: string;
    title: string;
    status: IdeaStatus;
    created: string;
    updated?: string;
    version: number;
    tags: string[];
    parent_id: string | null;
    child_ids: string[];
    requires_load: string[];
    content: string;
    _path?: string;
}