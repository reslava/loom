/** Fields of a step that loom_update_step may amend. These are exactly the
 *  frontmatter-owned step fields (the canonical store / table columns). `title` and
 *  `detail` are deliberately absent — they are body-owned prose (see frontmatterUtils),
 *  edited via loom_patch_doc, never duplicated into the structured step. */
export interface StepPatch {
    description?: string;
    files_touched?: string[];
    blockedBy?: string[];
    satisfies?: string[];
}

export type PlanEvent =
    | { type: 'CREATE_PLAN' }
    | { type: 'ACTIVATE_PLAN' }
    | { type: 'START_IMPLEMENTING_PLAN' }
    | { type: 'COMPLETE_STEP'; stepIndex: number; planId?: string }
    | { type: 'UPDATE_STEP'; stepId: string; patch: StepPatch; planId?: string }
    | { type: 'REORDER_STEPS'; orderedStepIds: string[]; planId?: string }
    | { type: 'FINISH_PLAN' }
    | { type: 'BLOCK_PLAN' }
    | { type: 'UNBLOCK_PLAN' }
    | { type: 'CANCEL_PLAN' };
