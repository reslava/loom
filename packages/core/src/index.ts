// ============================================================================
// Base Document
// ============================================================================
export { BaseDoc, DocumentType } from './entities/base';

// ============================================================================
// Entities
// ============================================================================
export { IdeaDoc, IdeaStatus } from './entities/idea';
export { DesignDoc, DesignStatus } from './entities/design';
export { PlanDoc, PlanStatus, PlanStep, StepStatus } from './entities/plan';
export { CtxDoc, CtxStatus } from './entities/ctx';
export { ChatDoc, ChatStatus } from './entities/chat';
export { DoneDoc, DoneStatus } from './entities/done';
export { ReferenceDoc, ReferenceStatus, LoadAxis } from './entities/reference';
export { ReqDoc, ReqStatus, ReqItem, ParsedReq, parseReq } from './entities/req';
export { checkReqCoverage, isReqSatisfied, ReqCoverage } from './reqCoverage';
export { Weave, WeaveStatus, WeavePhase } from './entities/weave';
export { Thread, ThreadStatus, Fiber } from './entities/thread';
export { LoomState, LoomMode } from './entities/state';
export {
    OperationMode,
    DocScope,
    EmitReason,
    ExcludeReason,
    ContextOverrides,
    ContextPrefsEntry,
    ContextPrefs,
    BundledDoc,
    ExcludedDoc,
    ContextBundle,
} from './entities/context';

// ============================================================================
// Events
// ============================================================================
export { IdeaEvent } from './events/ideaEvents';
export { DesignEvent } from './events/designEvents';
export { PlanEvent } from './events/planEvents';
export { WorkflowEvent, DiagnosticEvent } from './events/workflowEvent';

// ============================================================================
// Reducers
// ============================================================================
export { ideaReducer } from './reducers/ideaReducer';
export { designReducer } from './reducers/designReducer';
export { planReducer } from './reducers/planReducer';

// ============================================================================
// Core Utilities
// ============================================================================
export { applyEvent, ApplyResult } from './applyEvent';
export { getWeaveStatus, getWeavePhase, isPlanStale, getStalePlans, getThreadStatus, isReqStale, getReqStaleDocs } from './derived';
export { createBaseFrontmatter, serializeFrontmatter, serializeStepsBlock, parseFrontmatterSteps } from './frontmatterUtils';
export { generateDocId, parseDocId, isUlidId, toKebabCaseId, stripTrailingTypeWord, ensureUniqueId, generatePermanentId, generatePlanId, generateChatId } from './idUtils';
export { ConfigRegistry } from './registry';
export { AIClient, Message } from './ai';
export { parseStepsTable, generateStepsTable, updateStepsTableInContent, serializePlanBody, slugifyStepId, stepsSectionHasRows } from './planTableUtils';
export { syncBodyH1 } from './bodyH1Sync';
export { isStepBlocked, findNextStep } from './planUtils';
export { createEmptyIndex, resolveId, LinkIndex, DocumentEntry, StepBlocker } from './linkIndex';
export {
    validateParentExists,
    getDanglingChildIds,
    validateStepBlockers,
    ValidationIssue
} from './validation';

// ============================================================================
// Filters
// ============================================================================
export { filterWeavesByStatus, filterWeavesByPhase, filterWeavesById } from './filters/weaveFilters';
export { filterDocumentsByType, filterDocumentsByStatus, filterDocumentsByTitle } from './filters/documentFilters';
export { filterPlansByStaleness, filterPlansByTargetVersion, filterPlansWithBlockedSteps } from './filters/planFilters';
export { sortWeavesById, sortDocumentsByCreated, sortDocumentsByTitle } from './filters/sorting';

// ============================================================================
// Body Generators
// ============================================================================
export { generateIdeaBody } from './bodyGenerators/ideaBody';
export { generateDesignBody } from './bodyGenerators/designBody';
export { generatePlanBody } from './bodyGenerators/planBody';
export { generateCtxBody, CtxSummaryData } from './bodyGenerators/ctxBody';

// ============================================================================
// Shared Types
// ============================================================================
export { Document, DocumentStatus } from './entities/document';