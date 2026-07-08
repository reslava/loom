import * as path from 'path';
import { getTelemetryEnv } from './telemetryConsent';
import type { BundledServerSpec } from './agentMcpConfig';

// The pure config builder lives in a vscode-free module (so it's node-testable);
// re-export it here so callers have a single import site for the server surface.
export type { BundledServerSpec } from './agentMcpConfig';
export { buildAgentMcpConfig } from './agentMcpConfig';

/**
 * Single source of truth for how the bundled Loom MCP server is spawned: VS Code's
 * own binary as Node (ELECTRON_RUN_AS_NODE) running the VSIX-bundled dist/loom-mcp.js
 * — no global `loom` CLI and no user-installed Node required.
 *
 * Both the in-process client transport (mcp-client.ts) and the launched-agent
 * `--mcp-config` (claudeTerminal.ts) build from this, so the two can never diverge in
 * how they start the server. `env` carries only the Loom-specific additions
 * (ELECTRON_RUN_AS_NODE, LOOM_ROOT, telemetry); each caller merges it over the
 * environment its spawn inherits.
 *
 * `serverDir` defaults to this module's directory (the extension's `dist/`, alongside
 * `loom-mcp.js`); it is injectable for tests.
 */
export function bundledServerSpec(workspaceRoot: string, serverDir: string = __dirname): BundledServerSpec {
    return {
        command: process.execPath,
        args: [path.join(serverDir, 'loom-mcp.js')],
        env: { ELECTRON_RUN_AS_NODE: '1', LOOM_ROOT: workspaceRoot, ...getTelemetryEnv() },
    };
}
