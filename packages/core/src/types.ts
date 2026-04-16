// Import all domain types explicitly
import { IdeaDoc, IdeaStatus } from './entities/idea';
import { DesignDoc, DesignStatus } from './entities/design';
import { PlanDoc, PlanStatus, PlanStep } from './entities/plan';
import { CtxDoc, CtxStatus } from './entities/ctx';
import { Thread } from './entities/thread';

import { IdeaEvent } from './events/ideaEvents';
import { DesignEvent } from './events/designEvents';
import { PlanEvent } from './events/planEvents';

import { ideaReducer } from './reducers/ideaReducer';
import { designReducer } from './reducers/designReducer';
import { planReducer } from './reducers/planReducer';

// Re-export for backward compatibility
export { IdeaDoc, IdeaStatus };
export { DesignDoc, DesignStatus };
export { PlanDoc, PlanStatus, PlanStep };
export { CtxDoc, CtxStatus };
export { Thread };

export { IdeaEvent, DesignEvent, PlanEvent };
export { ideaReducer, designReducer, planReducer };

// Base document type
export type DocumentType = 'idea' | 'design' | 'plan' | 'ctx';

// Union of all document types
export type Document = IdeaDoc | DesignDoc | PlanDoc | CtxDoc;

// Union of all document statuses
export type DocumentStatus = IdeaStatus | DesignStatus | PlanStatus | CtxStatus;

// Diagnostic events (no state mutation)
export type DiagnosticEvent =
    | { type: 'CHECK_THREAD' }
    | { type: 'SUMMARIZE_CONTEXT' };

// Union of all workflow events
export type WorkflowEvent = IdeaEvent | DesignEvent | PlanEvent | DiagnosticEvent;

// Derived thread state
export type ThreadStatus = 'CANCELLED' | 'IMPLEMENTING' | 'ACTIVE' | 'DONE';
export type ThreadPhase = 'ideating' | 'designing' | 'planning' | 'implementing';