// Pure, vscode-free module — safe to import from a plain Node test (see
// tests/agent-mcp-config.test.ts). Keep it dependency-free so it stays testable.

export interface BundledServerSpec {
    command: string;
    args: string[];
    /** ONLY the Loom-specific env additions — callers merge over the inherited environment. */
    env: Record<string, string>;
}

/**
 * Build the `--mcp-config` JSON a launched Claude Code agent uses to bind Loom's
 * server. The `loom` entry always points at the bundled server (`spec`), so the
 * agent runs the exact same server version as the extension — never the project
 * `.mcp.json` and never a global `loom` CLI. Combined with `--strict-mcp-config`,
 * this is the load-bearing guarantee that agent version == extension version.
 *
 * `otherServers` (D1(c)) are the user's *other* MCP servers, merged in so a strict
 * launch doesn't strip them; the bundled `loom` always wins the `loom` key. Omit it
 * for the loom-only form.
 */
export function buildAgentMcpConfig(
    spec: BundledServerSpec,
    otherServers: Record<string, unknown> = {},
): string {
    const rest: Record<string, unknown> = { ...otherServers };
    delete rest.loom; // the bundled loom always wins the `loom` key
    return JSON.stringify({
        mcpServers: {
            ...rest,
            loom: { type: 'stdio', command: spec.command, args: spec.args, env: spec.env },
        },
    }, null, 2);
}
