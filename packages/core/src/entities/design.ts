export type DesignStatus =
    | 'draft'
    | 'active'
    | 'closed'
    | 'done'
    | 'cancelled';

export interface DesignDoc {
    type: 'design';
    id: string;
    title: string;
    status: DesignStatus;
    created: string;
    updated?: string;
    version: number;
    tags: string[];
    parent_id: string | null;
    child_ids: string[];
    requires_load: string[];
    role?: 'primary' | 'supporting';
    target_release?: string;
    actual_release?: string | null;
    refined?: boolean;
    content: string;
    _path?: string;
}