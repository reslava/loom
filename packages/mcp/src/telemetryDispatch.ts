import { TelemetryClient } from '../../telemetry/dist';
import {
    trackCommandInvoked,
    trackDocGenerated,
    trackDocRefined,
    trackPlanStarted,
    trackStepCompleted,
    trackPlanDone,
    trackError,
} from '../../app/dist/telemetry/events';

/**
 * Dispatcher-seam telemetry (design decision B): the MCP `CallTool` handler is
 * the single point every `loom_*` write funnels through — from the Claude Code
 * agent AND the VS Code extension (an MCP client). We emit here, keyed off the
 * wire tool name, so one wrapper instruments all of it. The app-layer taxonomy
 * (packages/app/src/telemetry/events) remains the only emitter; this table is
 * just the call site.
 */

/** Wire tool name → the loop event it represents, beyond the generic command_invoked. */
const LOOP_EVENT: Record<string, (t: TelemetryClient) => void> = {
    // {generate} phase — a structured doc is born (Claude Code create* path)…
    loom_create_idea: (t) => trackDocGenerated(t, 'idea'),
    loom_create_design: (t) => trackDocGenerated(t, 'design'),
    loom_create_plan: (t) => trackDocGenerated(t, 'plan'),
    loom_create_req: (t) => trackDocGenerated(t, 'req'),
    // …and the sampling-fallback generate* path.
    loom_generate_idea: (t) => trackDocGenerated(t, 'idea'),
    loom_generate_design: (t) => trackDocGenerated(t, 'design'),
    loom_generate_plan: (t) => trackDocGenerated(t, 'plan'),
    loom_generate_req: (t) => trackDocGenerated(t, 'req'),
    // {refine} phase.
    loom_refine_idea: (t) => trackDocRefined(t, 'idea'),
    loom_refine_design: (t) => trackDocRefined(t, 'design'),
    loom_refine_plan: (t) => trackDocRefined(t, 'plan'),
    // loop transitions.
    loom_start_plan: (t) => trackPlanStarted(t),
    loom_complete_step: (t) => trackStepCompleted(t),
    loom_close_plan: (t) => trackPlanDone(t),
};

/**
 * Emit telemetry for a tool call that succeeded: always `command_invoked` (coarse
 * "which tools fire"), plus the loop event if this tool maps to one.
 */
export function emitToolSuccess(telemetry: TelemetryClient, toolName: string): void {
    trackCommandInvoked(telemetry, toolName);
    LOOP_EVENT[toolName]?.(telemetry);
}

/**
 * Emit an `error` event for a tool call that threw. Sends only the tool name and
 * the error's constructor name — never the message, which could carry content.
 */
export function emitToolError(telemetry: TelemetryClient, toolName: string, err: unknown): void {
    const errorClass = err instanceof Error ? err.constructor.name : 'UnknownError';
    trackError(telemetry, toolName, errorClass);
}
