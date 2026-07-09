// Standalone entry for the Loom MCP server, bundled into the VSIX as
// dist/loom-mcp.js. The extension spawns this file on VS Code's own
// Electron-as-Node (process.execPath + ELECTRON_RUN_AS_NODE=1), so a working
// Loom MCP server ships with the extension and needs no global `loom` CLI
// install. This mirrors the `loom mcp` boot in packages/cli/src/index.ts,
// minus commander — the whole server (mcp + app + core + fs + telemetry) is
// inlined by esbuild (see esbuild.js).
//
// stdout is the JSON-RPC channel; only ever write diagnostics to stderr.
import { StdioServerTransport } from '@modelcontextprotocol/sdk/server/stdio.js';
import { createLoomMcpServer } from '../../mcp/dist/server';
import { resolveLoomRoot, loomRootNotice } from '../../fs/dist';
import { buildServerTelemetry, startTelemetrySession, flushOnExit } from '../../mcp/dist/telemetryConfig';

const pkg = require('../package.json') as { version: string };

async function main(): Promise<void> {
    const { root, source } = resolveLoomRoot(process.env, process.cwd());
    const notice = loomRootNotice(source, root, process.cwd());
    if (notice) console.error(notice);
    // Telemetry is constructed here but stays a no-op unless a PostHog key is
    // baked into the bundle at release time (see esbuild define, step 3) and the
    // user has opted in — a key-less build can never send.
    const telemetry = buildServerTelemetry(pkg.version);
    startTelemetrySession(telemetry);
    flushOnExit(telemetry);
    const server = createLoomMcpServer(root, telemetry);
    const transport = new StdioServerTransport();
    await server.connect(transport);
}

main().catch((err: any) => {
    console.error('Failed to start Loom MCP server:', err?.message ?? err);
    process.exit(1);
});
