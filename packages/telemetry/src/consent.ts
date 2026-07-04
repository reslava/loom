import { Surface } from './types';

/**
 * Everything a concrete telemetry client needs. The host (CLI / MCP server / VS
 * Code extension) resolves `enabled` from its own opt-in mechanism and passes it
 * in — this package never reads VS Code settings or decides policy on its own.
 */
export interface TelemetryConfig {
    /** Opt-in flag. Telemetry stays OFF unless the host set this to `true`. */
    enabled: boolean;
    /** Entry surface, tagged onto every event. */
    surface: Surface;
    /** Loom version string, sent as a common prop. */
    loomVersion: string;
    /** PostHog project key (public/write-only). No key ⇒ nothing can be sent. */
    apiKey?: string;
    /** Capture host. Defaults to the EU PostHog host inside the transport. */
    host?: string;
    /** Where the anonymous install id is stored. Defaults to the OS config dir. */
    configDir?: string;
    /** Process env, injectable for tests. Defaults to `process.env`. */
    env?: NodeJS.ProcessEnv;
}

/**
 * The opt-in gate. Telemetry is enabled only when the host explicitly opted in
 * AND a capture key is present — either condition missing means a Noop client.
 * This is the single place the "opt-in only" policy is enforced.
 */
export function resolveConsent(config: TelemetryConfig): boolean {
    return config.enabled === true && !!config.apiKey;
}

/**
 * Interpret the `LOOM_TELEMETRY` env var (the CLI / agent opt-in switch). Opt-in
 * semantics: only an explicit truthy value enables it; absence or anything else
 * means disabled. Never treat "unset" as consent.
 */
export function consentFromEnv(env: NodeJS.ProcessEnv = process.env): boolean {
    const v = (env.LOOM_TELEMETRY ?? '').trim().toLowerCase();
    return v === '1' || v === 'true' || v === 'on' || v === 'yes';
}
