export type IdeaEvent =
    | { type: 'ACTIVATE_IDEA' }
    | { type: 'COMPLETE_IDEA' }
    | { type: 'CANCEL_IDEA' };