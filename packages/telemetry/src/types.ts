/**
 * Telemetry contract — the surface `app` use-cases depend on (injected via `deps`).
 *
 * Deliberately tiny and infrastructure-only: this package imports nothing from
 * `core`/`fs`/`app`. It carries no Loom domain vocabulary — the event names and
 * their props live in the app-layer taxonomy (packages/app/src/telemetry). That
 * split is what lets the transport/consent/identity core be reused verbatim in
 * other repos (e.g. chord-flow) with a different event vocabulary and key.
 */

/**
 * Allowed telemetry property value. Restricted to non-content scalars on purpose.
 * Strings are permitted, but the app-layer taxonomy only ever passes fixed enums
 * (e.g. a doc `type`, an `error_class`) — never document content, titles, slugs,
 * or paths. The content-free guarantee is enforced by that single caller, not by
 * this type alone.
 */
export type TelemetryPropValue = string | number | boolean;

export type TelemetryProps = Record<string, TelemetryPropValue>;

/** The entry surface an event originated from. Tagged onto every event. */
export type Surface = 'extension' | 'cli' | 'agent';

/**
 * A telemetry sink. Both methods are fire-and-forget: `track` never throws and
 * never blocks a workflow action; `flush` always resolves, even when the
 * transport fails. When telemetry is disabled, the injected implementation is
 * `NoopTelemetry`, so callers never branch on an enabled flag.
 */
export interface TelemetryClient {
    /** Record a single event. Must not throw and must not block. */
    track(event: string, props?: TelemetryProps): void;
    /** Flush any buffered events. Resolves even on transport failure. */
    flush(): Promise<void>;
}
