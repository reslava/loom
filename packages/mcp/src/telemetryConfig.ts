import * as fs from 'fs';
import * as path from 'path';
import { TelemetryClient, createTelemetry, consentFromEnv, defaultConfigDir, Surface } from '../../telemetry/dist';
import { trackWorkspaceActivated, trackSessionStarted } from '../../app/dist/telemetry/events';

/**
 * PostHog project key — public/write-only, safe to ship. Inlined into the CLI
 * bundle at build time via the esbuild `define` for `process.env.LOOM_POSTHOG_KEY`
 * (see packages/cli/esbuild.js). Empty ⇒ telemetry is structurally Noop, so a
 * key-less build never sends. The dev/standalone server reads it from the env.
 */
const POSTHOG_KEY = process.env.LOOM_POSTHOG_KEY ?? '';

/**
 * Build the telemetry client for a server process. Surface comes from
 * `LOOM_SURFACE` (the VS Code extension sets `extension` when it spawns
 * `loom mcp`; Claude Code leaves it unset ⇒ `agent`). Consent comes from
 * `LOOM_TELEMETRY`. Disabled or key-less ⇒ shared NoopTelemetry.
 */
export function buildServerTelemetry(
    loomVersion: string,
    env: NodeJS.ProcessEnv = process.env,
): TelemetryClient {
    const surface: Surface = (env.LOOM_SURFACE as Surface) || 'agent';
    return createTelemetry({
        enabled: consentFromEnv(env),
        surface,
        loomVersion,
        apiKey: POSTHOG_KEY || undefined,
        env,
    });
}

/**
 * Build the telemetry client for a CLI-direct invocation (surface `cli`). Same
 * consent/key gate; the surface is forced rather than read from env.
 */
export function buildCliTelemetry(
    loomVersion: string,
    env: NodeJS.ProcessEnv = process.env,
): TelemetryClient {
    return createTelemetry({
        enabled: consentFromEnv(env),
        surface: 'cli',
        loomVersion,
        apiKey: POSTHOG_KEY || undefined,
        env,
    });
}

/** Register a best-effort `flush()` on process exit so buffered events aren't lost. */
export function flushOnExit(telemetry: TelemetryClient): void {
    const flush = (): void => void telemetry.flush();
    process.once('SIGINT', flush);
    process.once('SIGTERM', flush);
    process.once('beforeExit', flush);
}

/**
 * Emit the once-per-process start events (`workspace_activated`, `session_started`)
 * and register the exit flush. Used by the long-lived MCP server processes.
 */
export function startTelemetrySession(telemetry: TelemetryClient): void {
    trackWorkspaceActivated(telemetry);
    trackSessionStarted(telemetry);
    flushOnExit(telemetry);
}

/**
 * Print the one-time CLI telemetry notice (opt-in disclosure for the terminal /
 * agent path, which has no interactive prompt). No-op if the user already made a
 * choice via `LOOM_TELEMETRY`, or if the notice was already shown (a benign marker
 * file in the config dir — not telemetry data, nothing is sent). Failures are
 * swallowed so a notice never disrupts the CLI.
 */
export function maybeShowCliNotice(env: NodeJS.ProcessEnv = process.env): void {
    if (env.LOOM_TELEMETRY !== undefined && env.LOOM_TELEMETRY.trim() !== '') {
        return;
    }
    try {
        const marker = path.join(defaultConfigDir(env), 'telemetry-notice');
        if (fs.existsSync(marker)) {
            return;
        }
        fs.mkdirSync(path.dirname(marker), { recursive: true });
        fs.writeFileSync(marker, new Date().toISOString(), 'utf8');
        process.stderr.write(
            'ℹ Loom can collect anonymous, content-free usage telemetry (opt-in, off by default). ' +
                'Enable with LOOM_TELEMETRY=1; see the README for exactly what is sent.\n',
        );
    } catch {
        /* never let a notice disrupt the CLI */
    }
}
