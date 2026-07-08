import * as vscode from 'vscode';
import { Client } from '@modelcontextprotocol/sdk/client/index.js';
import { StdioClientTransport } from '@modelcontextprotocol/sdk/client/stdio.js';
import { CreateMessageRequestSchema } from '@modelcontextprotocol/sdk/types.js';
import { makeAIClient } from './ai/makeAIClient';
import { bundledServerSpec } from './bundledServer';

// MCP SDK default request timeout is 60s. AI-bound tools (sampling round-trips
// to remote LLMs) routinely exceed that on long inputs, producing
// JSON-RPC 32001 timeouts that the user sees as "MCP timed out — click to
// reconnect". Override per call class.
const AI_TOOL_TIMEOUT_MS = 10 * 60 * 1000;    // promote / refine / generate / do_step
const TOOL_TIMEOUT_MS = 2 * 60 * 1000;        // non-AI mutations
const RESOURCE_READ_TIMEOUT_MS = 30 * 1000; // state reads — if stalled, reconnect is better than a 5-min freeze

const AI_TOOL_PREFIXES = ['loom_promote', 'loom_refine_', 'loom_generate_', 'loom_do_step', 'loom_verify_req'];

function isAIBoundTool(name: string): boolean {
    return AI_TOOL_PREFIXES.some(p => name.startsWith(p));
}

let _client: LoomMCPClient | undefined;
let _mcpConnected = false;
let _out: vscode.OutputChannel | undefined;

function getOut(): vscode.OutputChannel {
    if (!_out) _out = vscode.window.createOutputChannel('Loom MCP');
    return _out;
}

export function getMCPConnected(): boolean {
    return _mcpConnected;
}

export interface LoomMCPClient {
    readResource(uri: string): Promise<string>;
    callTool(name: string, args: Record<string, unknown>): Promise<unknown>;
    callPrompt(name: string, args: Record<string, string>): Promise<string>;
    dispose(): void;
}

export function getMCP(workspaceRoot: string): LoomMCPClient {
    if (!_client) {
        _client = createMCPClient(workspaceRoot);
    }
    return _client;
}

export function disposeMCP(): void {
    _client?.dispose();
    _client = undefined;
    _mcpConnected = false;
}

function createMCPClient(workspaceRoot: string): LoomMCPClient {
    const out = getOut();
    // Spawn the Loom MCP server bundled into the VSIX (dist/loom-mcp.js) via the
    // shared bundledServerSpec — the single source of truth also used by the
    // launched-agent --mcp-config, so the two can never diverge. The in-process
    // transport inherits the full environment; spec.env layers the Loom-specific
    // additions (ELECTRON_RUN_AS_NODE, LOOM_ROOT, telemetry) on top.
    const spec = bundledServerSpec(workspaceRoot);
    const transport = new StdioClientTransport({
        command: spec.command,
        args: spec.args,
        env: { ...process.env as Record<string, string>, ...spec.env },
        stderr: 'pipe',
    });

    transport.stderr?.on('data', (chunk: Buffer) => {
        for (const line of chunk.toString('utf8').split(/\r?\n/)) {
            if (line) out.appendLine(`[server] ${line}`);
        }
    });
    transport.onclose = () => {
        out.appendLine('[server] transport closed');
        _mcpConnected = false;
    };

    let inFlight = 0;
    let nextReqId = 1;

    async function logged<T>(kind: 'readResource' | 'callTool' | 'callPrompt', label: string, fn: () => Promise<T>): Promise<T> {
        const id = nextReqId++;
        const startedAt = Date.now();
        inFlight++;
        out.appendLine(`[client] ${kind} start id=${id} ${label} inFlight=${inFlight}`);
        try {
            const r = await fn();
            const ms = Date.now() - startedAt;
            out.appendLine(`[client] ${kind} ok    id=${id} ${label} durationMs=${ms}`);
            return r;
        } catch (e: unknown) {
            const ms = Date.now() - startedAt;
            const msg = e instanceof Error ? e.message : String(e);
            out.appendLine(`[client] ${kind} FAIL  id=${id} ${label} durationMs=${ms} err=${msg}`);
            throw e;
        } finally {
            inFlight--;
        }
    }

    const client = new Client({ name: 'loom-vscode', version: '0.1.0' }, { capabilities: { sampling: {} } });

    client.setRequestHandler(CreateMessageRequestSchema, async (request) => {
        const { messages, systemPrompt } = request.params;
        const aiMessages: Array<{ role: 'system' | 'user' | 'assistant'; content: string }> = [];
        if (systemPrompt) {
            aiMessages.push({ role: 'system', content: systemPrompt });
        }
        for (const msg of messages) {
            const content = msg.content as { type?: string; text?: string };
            if (content?.type === 'text' && content.text !== undefined) {
                aiMessages.push({ role: msg.role as 'user' | 'assistant', content: content.text });
            }
        }
        const text = await makeAIClient().complete(aiMessages);
        return {
            model: 'extension-configured',
            stopReason: 'endTurn',
            role: 'assistant' as const,
            content: { type: 'text' as const, text },
        };
    });

    let connected = false;
    let connectError: Error | undefined;
    const connectPromise = client.connect(transport).then(() => {
        connected = true;
        _mcpConnected = true;
    }).catch((err: Error) => {
        connectError = err;
        _mcpConnected = false;
        console.error('🧵 MCP connect failed:', err.message);
        vscode.window.showErrorMessage(`Loom MCP failed to start: ${err.message}`);
    });

    async function ensureConnected(): Promise<void> {
        if (!connected) {
            await connectPromise;
            if (connectError) throw connectError;
        }
    }

    return {
        async readResource(uri: string): Promise<string> {
            await ensureConnected();
            return logged('readResource', uri, async () => {
                const result = await client.readResource({ uri }, { timeout: RESOURCE_READ_TIMEOUT_MS });
                const first = result.contents[0];
                if (!first) throw new Error(`No content for resource: ${uri}`);
                return 'text' in first ? first.text as string : '';
            });
        },

        async callTool(name: string, args: Record<string, unknown>): Promise<unknown> {
            await ensureConnected();
            const timeout = isAIBoundTool(name) ? AI_TOOL_TIMEOUT_MS : TOOL_TIMEOUT_MS;
            return logged('callTool', name, async () => {
                const result = await client.callTool({ name, arguments: args }, undefined, { timeout });
                if ('isError' in result && result.isError) throw new Error(`Tool ${name} returned error`);
                if (!('content' in result)) return result;
                const first = (result.content as unknown[])[0] as Record<string, unknown> | undefined;
                return first && 'text' in first ? JSON.parse(first.text as string) : result;
            });
        },

        async callPrompt(name: string, args: Record<string, string>): Promise<string> {
            await ensureConnected();
            return logged('callPrompt', name, async () => {
                const result = await client.getPrompt({ name, arguments: args }, { timeout: AI_TOOL_TIMEOUT_MS });
                return result.messages
                    .filter(m => 'text' in m.content)
                    .map(m => (m.content as { text: string }).text)
                    .join('\n');
            });
        },

        dispose(): void {
            out.appendLine('[client] dispose');
            transport.close().catch(() => {});
        },
    };
}
