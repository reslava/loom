export type PlanStatus =
    | 'draft'
    | 'active'
    | 'implementing'
    | 'blocked'
    | 'done'
    | 'cancelled';

export interface PlanStep {
    order: number;
    description: string;
    done: boolean;
    files_touched: string[];
    blockedBy: string[];
}

export interface PlanDoc {
    type: 'plan';
    id: string;
    title: string;
    status: PlanStatus;
    created: string;
    updated?: string;
    version: number;
    design_version: number;
    tags: string[];
    parent_id: string;
    child_ids: string[];
    requires_load: string[];
    target_version: string;
    staled?: boolean;
    steps: PlanStep[];
    content: string;
    _path?: string;
}