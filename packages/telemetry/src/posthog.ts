import { TelemetryClient, TelemetryProps } from './types';
import { TelemetryConfig, resolveConsent } from './consent';
import { getOrCreateInstallId, newSessionId } from './identity';
import { buildCommonProps } from './props';
import { noopTelemetry } from './noop';

/** EU capture host — chosen for privacy optics (data stays in the EU). */
const DEFAULT_HOST = 'https://eu.i.posthog.com';
/** Auto-flush once this many events are buffered. */
const MAX_BATCH = 20;
/** Idle auto-flush so a long-lived host (extension/MCP server) doesn't sit on events. */
const FLUSH_INTERVAL_MS = 15_000;
/** Hard cap on a capture request — telemetry must never hang a workflow. */
const REQUEST_TIMEOUT_MS = 3_000;

interface QueuedEvent {
    event: string;
    properties: Record<string, unknown>;
    timestamp: string;
}

/**
 * PostHog capture client. Every event carries the anonymous `distinct_id`
 * (install id), a per-process `$session_id`, and the content-free common props.
 * All I/O is fire-and-forget with a bounded timeout and swallowed errors — a
 * telemetry failure can never throw into, block, or slow a Loom action.
 *
 * Construct via `createTelemetry`, never directly, so the consent gate is always
 * applied.
 */
export class PostHogTelemetry implements TelemetryClient {
    private readonly host: string;
    private readonly apiKey: string;
    private readonly distinctId: string;
    private readonly sessionId: string;
    private readonly common: TelemetryProps;
    private queue: QueuedEvent[] = [];
    private timer: ReturnType<typeof setTimeout> | undefined;

    constructor(config: TelemetryConfig & { apiKey: string }) {
        this.host = (config.host ?? DEFAULT_HOST).replace(/\/+$/, '');
        this.apiKey = config.apiKey;
        this.distinctId = getOrCreateInstallId(config.configDir, config.env);
        this.sessionId = newSessionId();
        this.common = buildCommonProps({
            surface: config.surface,
            loomVersion: config.loomVersion,
            env: config.env,
        });
    }

    track(event: string, props: TelemetryProps = {}): void {
        try {
            this.queue.push({
                event,
                properties: {
                    ...this.common,
                    ...props,
                    distinct_id: this.distinctId,
                    $session_id: this.sessionId,
                },
                timestamp: new Date().toISOString(),
            });
            if (this.queue.length >= MAX_BATCH) {
                void this.flush();
            } else {
                this.scheduleFlush();
            }
        } catch {
            /* telemetry must never disturb the caller */
        }
    }

    async flush(): Promise<void> {
        if (this.timer) {
            clearTimeout(this.timer);
            this.timer = undefined;
        }
        if (this.queue.length === 0) return;
        const batch = this.queue;
        this.queue = [];

        const controller = new AbortController();
        const timeout = setTimeout(() => controller.abort(), REQUEST_TIMEOUT_MS);
        try {
            await fetch(`${this.host}/batch/`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ api_key: this.apiKey, batch }),
                signal: controller.signal,
            });
        } catch {
            /* silent — a dropped batch is acceptable; never surface it */
        } finally {
            clearTimeout(timeout);
        }
    }

    private scheduleFlush(): void {
        if (this.timer) return;
        this.timer = setTimeout(() => void this.flush(), FLUSH_INTERVAL_MS);
        // Never keep the process alive solely to flush telemetry.
        (this.timer as { unref?: () => void }).unref?.();
    }
}

/**
 * The only telemetry constructor callers should use. Returns the shared Noop
 * client unless consent passes (opt-in enabled AND a key present), so a disabled
 * or misconfigured setup is structurally incapable of emitting.
 */
export function createTelemetry(config: TelemetryConfig): TelemetryClient {
    if (!resolveConsent(config) || !config.apiKey) {
        return noopTelemetry;
    }
    return new PostHogTelemetry({ ...config, apiKey: config.apiKey });
}
