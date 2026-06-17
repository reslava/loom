// ============================================================================
// Use‑Cases — Core Workflow
// ============================================================================
export { completeStep, CompleteStepInput, CompleteStepDeps } from './completeStep';
export { finalize, FinalizeInput, FinalizeDeps } from './finalize';
export { rename, RenameInput, RenameDeps } from './rename';
export { runEvent, RunEventDeps } from './runEvent';
export { validate, ValidateInput, ValidateDeps, ValidationResult } from './validate';
export { weaveIdea, WeaveIdeaInput, WeaveIdeaDeps } from './weaveIdea';
export { weaveDesign, WeaveDesignInput, WeaveDesignDeps } from './weaveDesign';
export { weavePlan, WeavePlanInput, WeavePlanDeps } from './weavePlan';
export { refineDesign, RefineDesignInput, RefineDesignDeps } from './refineDesign';
export {
    createReq, amendReq, finalizeReq, lockedReqVersion,
    CreateReqInput, AmendReqInput, FinalizeReqInput, ReqDeps,
} from './req';

// ============================================================================
// Use‑Cases — Loom Management
// ============================================================================
export { initLocal, InitLocalInput, initMulti, InitMultiInput, InitDeps } from './init';
export { setupLoom, SetupInput, SetupDeps } from './setup';
export { switchLoom, SwitchInput, SwitchDeps } from './switch';
export { listLooms, LoomListEntry, ListDeps } from './list';
export { currentLoom, CurrentLoomInfo, CurrentDeps } from './current';

// ============================================================================
// Use‑Cases — State
// ============================================================================
export { getState, GetStateDeps, GetStateInput } from './getState';
export {
    recordRelease, backfillReleases,
    RecordReleaseInput, BackfillReleasesInput, RecordReleaseDeps,
    RecordReleaseResult, StampedPlan, SkippedPlan, ReleaseDate,
} from './recordRelease';
export { searchDocs, SearchDocsInput, SearchDocsDeps, SearchResult } from './searchDocs';
export { getStaleDocs, GetStaleDocsDeps, StaleDoc } from './getStaleDocs';
export { getBlockedSteps, GetBlockedStepsDeps, BlockedStep } from './getBlockedSteps';

// ============================================================================
// Use‑Cases — Context Pipeline
// ============================================================================
export { assembleContext, classifyScope } from './context/assembleContext';
export { serializeBundle, bundleVisibilityLines } from './context/serializeBundle';
export {
    buildCtxSource, ctxTarget, computeSourceHash, buildCtxFrontmatter, buildCtxShell,
    CtxScope, CtxTarget,
} from './buildCtxSource';

// ============================================================================
// Utilities
// ============================================================================
export { resolveThread } from './utils/resolveThread';