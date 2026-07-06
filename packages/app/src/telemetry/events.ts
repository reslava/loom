import { TelemetryClient } from '../../../telemetry/dist';

/**
 * The Loom event taxonomy — the ONLY place domain events become telemetry.
 *
 * Why it lives in `app`, not in `packages/telemetry`: the telemetry package is a
 * reusable, domain-agnostic transport (chord-flow can depend on it with its own
 * vocabulary). The Loop-specific event names and their props belong to Loom and
 * live here, next to the use-cases that emit them.
 *
 * Content-free guarantee: every helper passes only fixed enums / booleans /
 * caller-supplied identifiers (tool names, error classes) — never a document
 * title, slug, path, or body. This single choke point is what makes the
 * guarantee auditable. Do not add a helper that forwards free-form content.
 */

/** Doc types that can be generated/refined. Matches the workflow authoring chain. */
export type DocType = 'idea' | 'design' | 'req' | 'plan' | 'ctx';

/** Loom activated in a workspace — reach/engagement denominator. */
export function trackWorkspaceActivated(t: TelemetryClient): void {
    t.track('workspace_activated');
}

/** A new session began — retention anchor ("do they return"). */
export function trackSessionStarted(t: TelemetryClient): void {
    t.track('session_started');
}

/**
 * A new chat (the thinking surface) was opened — the loop's entry point. Answers
 * "is the collaboration medium actually used?". Fired on chat *creation* only, not
 * per reply: appends are high-volume and would swamp the signal.
 */
export function trackChatCreated(t: TelemetryClient): void {
    t.track('chat_created');
}

/** A structured doc was generated (the {generate} phase). */
export function trackDocGenerated(t: TelemetryClient, type: DocType): void {
    t.track('doc_generated', { type });
}

/** A structured doc was refined (the {refine} phase). */
export function trackDocRefined(t: TelemetryClient, type: DocType): void {
    t.track('doc_refined', { type });
}

/** A plan entered `implementing` — the loop was entered. */
export function trackPlanStarted(t: TelemetryClient): void {
    t.track('plan_started');
}

/** A plan step was completed — the core loop heartbeat. */
export function trackStepCompleted(t: TelemetryClient, hadError = false): void {
    t.track('step_completed', { had_error: hadError });
}

/** A plan reached `done` — loop closure / the success event. */
export function trackPlanDone(t: TelemetryClient): void {
    t.track('plan_done');
}

/**
 * An operation failed — where people stall. `operation` and `errorClass` must be
 * fixed identifiers (use-case name, error constructor name), never a message
 * carrying user/document content.
 */
export function trackError(t: TelemetryClient, operation: string, errorClass: string): void {
    t.track('error', { operation, error_class: errorClass });
}

/** A tool / command fired — coarse "which capabilities are used". */
export function trackCommandInvoked(t: TelemetryClient, command: string): void {
    t.track('command_invoked', { command });
}
