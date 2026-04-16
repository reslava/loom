export type DesignEvent =
    | { type: 'CREATE_DESIGN' }
    | { type: 'ACTIVATE_DESIGN' }
    | { type: 'CLOSE_DESIGN' }
    | { type: 'REOPEN_DESIGN' }
    | { type: 'REFINE_DESIGN' }
    | { type: 'FINALISE_DESIGN' }
    | { type: 'CANCEL_DESIGN' };