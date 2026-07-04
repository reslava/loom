/**
 * @reslava-loom/telemetry — portable, content-free telemetry core.
 *
 * Public surface:
 *  - TelemetryClient / TelemetryProps / Surface   (the contract app depends on)
 *  - NoopTelemetry / noopTelemetry                (the disabled default)
 *  - resolveConsent / TelemetryConfig             (opt-in gate — step 2)
 *  - getOrCreateInstallId / newSessionId          (identity — step 2)
 *  - buildCommonProps                             (common props — step 2)
 *  - PostHogTelemetry / createTelemetry           (transport — step 3)
 */
export * from './types';
export * from './noop';
export * from './consent';
export * from './identity';
export * from './props';
export * from './posthog';
