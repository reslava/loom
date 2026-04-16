export type PlanEvent =
    | { type: 'CREATE_PLAN' }
    | { type: 'ACTIVATE_PLAN' }
    | { type: 'START_IMPLEMENTING_PLAN' }
    | { type: 'COMPLETE_STEP'; stepIndex: number; planId?: string }
    | { type: 'FINISH_PLAN' }
    | { type: 'BLOCK_PLAN' }
    | { type: 'UNBLOCK_PLAN' }
    | { type: 'CANCEL_PLAN' };