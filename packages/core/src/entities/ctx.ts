export type CtxStatus =
    | 'draft'
    | 'active'
    | 'done'
    | 'cancelled';

export interface CtxDoc {
    type: 'ctx';
    id: string;
    title: string;
    status: CtxStatus;
    created: string;
    updated?: string;
    version: number;
    tags: string[];
    parent_id: string | null;
    child_ids: string[];
    requires_load: string[];
    source_version?: number;
    content: string;
    _path?: string;
}