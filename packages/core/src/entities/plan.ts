import { BaseDoc } from './base';

export type PlanStatus = 'draft' | 'active' | 'implementing' | 'done' | 'blocked' | 'cancelled';

/** Per-step lifecycle state. Replaces the old `done` boolean so the four Legend
 *  symbols (🔳/🔄/✅/❌) are each representable. The table symbol renders from this. */
export type StepStatus = 'pending' | 'in_progress' | 'done' | 'cancelled';

export interface PlanStep {
    /** Stable slug, unique within the plan. Survives reordering; `blockedBy` references it. */
    id: string;
    order: number;
    status: StepStatus;
    /** Short heading for the `### Step N — {title}` section. */
    title: string;
    description: string;
    files_touched: string[];
    /** Step ids (internal deps) and/or plan ids (cross-plan deps). Ordinals accepted for legacy. */
    blockedBy: string[];
    /** Requirement ids (IN/C handles from the thread's req) this step advances. */
    satisfies: string[];
    /** Markdown body rendered into the `### Step N` section. Optional. */
    detail?: string;
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