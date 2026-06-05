import { BaseDoc } from './base';

export type PlanStatus = 'draft' | 'active' | 'implementing' | 'done' | 'blocked' | 'cancelled';

export interface PlanStep {
    order: number;
    description: string;
    done: boolean;
    files_touched: string[];
    blockedBy: string[];
    /** Requirement ids (IN/C handles from the thread's req) this step advances. */
    satisfies: string[];
}

export interface PlanDoc extends BaseDoc<PlanStatus> {
    type: 'plan';
    status: PlanStatus;
    design_version: number;
    target_version: string;
    staled?: boolean;
    steps: PlanStep[];
    /** Locked req version this plan was last built against (req-staleness baseline). */
    req_version?: number;
}