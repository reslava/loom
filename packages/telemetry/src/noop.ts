import { TelemetryClient } from './types';

/**
 * The disabled telemetry client: every method is a no-op. This is the default
 * everywhere consent is absent, unknown, or resolution failed — so `app`
 * use-cases can call `deps.telemetry.track(...)` unconditionally with zero
 * branching and zero risk of network I/O.
 */
export class NoopTelemetry implements TelemetryClient {
    track(): void {
        /* intentionally empty */
    }
    async flush(): Promise<void> {
        /* intentionally empty */
    }
}

/** Shared singleton — the Noop client holds no state, so one instance is enough. */
export const noopTelemetry: TelemetryClient = new NoopTelemetry();
