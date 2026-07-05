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
export { ReqDoc, ReqStatus, ReqItem, ReqItemStatus, ParsedReq, parseReq } from './entities/req';
export { checkReqCoverage, isReqSatisfied, ReqCoverage } from './reqCoverage';
export { diffReqHandles, ReqHandleDiff } from './reqDiff';
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
    LoadedDoc,
    ManifestEntry,
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
export { getWeaveStatus, getWeavePhase, isPlanStale, getStalePlans, getThreadStatus, isReqStale, staleEntries } from './derived';
export type { StaleEntry, StaleReasonKind } from './derived';
export { toStateSummary } from './stateSummary';
export type { StateSummary, WeaveSummary, ThreadSummary } from './stateSummary';
export {
    buildRoadmap,
    RoadmapView,
    RoadmapNode,
    RoadmapStatus,
    ShippedPlan,
    RoadmapDiagnostic,
    RoadmapDiagnosticKind,
    DEFAULT_ROADMAP_PRIORITY,
} from './derived';
export { ThreadDoc, ThreadDocStatus } from './entities/thread';
export { createBaseFrontmatter, serializeFrontmatter, serializeStepsBlock, parseFrontmatterSteps } from './frontmatterUtils';
export { LoomDate, today, nowIso, toEpoch, compareDates, toCanonical } from './dates';
export { SemVer, parseVersion, compareVersions, maxVersion } from './versionUtils';
export { generateDocId, parseDocId, isUlidId, toKebabCaseId, stripTrailingTypeWord, ensureUniqueId, generatePermanentId, generatePlanId, generateChatId } from './idUtils';
export {
    OrdinalDocType, formatOrdinal, nextOrdinal,
    planFileName, doneFileName, chatFileName, singletonFileName,
    isPlanFile, isDoneFile, isChatFile, isIdeaFile, isDesignFile,
    planOrdinalFromFile, chatOrdinalFromFile,
} from './docNaming';
export { AIClient, Message } from './ai';
export { parseStepsTable, generateStepsTable, updateStepsTableInContent, serializePlanBody, slugifyStepId, stepsSectionHasRows, rekeyDetailSections } from './planTableUtils';
export { syncBodyH1 } from './bodyH1Sync';
export { isStepBlocked, findNextStep, resolveBlockedByIds } from './planUtils';
export { ChatBlock, parseChatBlocks, lastAiBlockIndex, tailAfterBlock, appendChatBlock } from './chatUtils';
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
// Feedback
// ============================================================================
export {
    FeedbackSnapshot, FeedbackContext, FEEDBACK_TEMPLATE_FILE, DEFAULT_FEEDBACK_REPO,
    formatFeedbackEnvironment, buildFeedbackUrl, resolveFeedbackRepo,
} from './feedback';

// ============================================================================
// Shared Types
// ============================================================================
export { Document, DocumentStatus } from './entities/document';