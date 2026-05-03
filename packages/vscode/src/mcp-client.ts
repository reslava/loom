import * as vscode from 'vscode';
import { Client } from '@modelcontextprotocol/sdk/client/index.js';
import { StdioClientTransport } from '@modelcontextprotocol/sdk/client/stdio.js';
import { CreateMessageRequestSchema } from '@modelcontextprotocol/sdk/types.js';
import { makeAIClient } from './ai/makeAIClient';

// MCP SDK default request timeout is 60s. AI-bound tools (sampling round-trips
// to remote LLMs) routinely exceed that on long inputs, producing
// JSON-RPC 32001 timeouts that the user sees as "MCP timed out — click to
// reconnect". Override per call class.
const AI_TOOL_TIMEOUT_MS = 5 * 60 * 1000;     // promote / refine / generate / do_step
const TOOL_TIMEOUT_MS = 60 * 1000;            // non-AI mutations
const RESOURCE_READ_TIMEOUT_MS = 2 * 60 * 1000; // state reads — generous for cold-start link-index build

const AI_TOOL_PREFIXES = ['loom_promote', 'loom_refine_', 'loom_generate_', 'loom_do_step'];

function isAIBoundTool(name: string): boolean {
    return AI_TOOL_PREFIXES.some(p => name.startsWith(p));
}

let _client: LoomMCPClient | undefined;

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
}

function createMCPClient(workspaceRoot: string): LoomMCPClient {
    const transport = new StdioClientTransport({
        command: 'loom',
        args: ['mcp'],
        env: { ...process.env as Record<string, string>, LOOM_ROOT: workspaceRoot },
        stderr: 'pipe',
    });

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
    const connectPromise = client.connect(transport).then(() => {
        connected = true;
    }).catch((err: Error) => {
        console.error('🧵 MCP connect failed:', err.message);
        vscode.window.showErrorMessage(`Loom MCP failed to start: ${err.message}`);
    });

    async function ensureConnected(): Promise<void> {
        if (!connected) await connectPromise;
    }

    return {
        async readResource(uri: string): Promise<string> {
            await ensureConnected();
            const result = await client.readResource({ uri }, { timeout: RESOURCE_READ_TIMEOUT_MS });
            const first = result.contents[0];
            if (!first) throw new Error(`No content for resource: ${uri}`);
            return 'text' in first ? first.text : '';
        },

        async callTool(name: string, args: Record<string, unknown>): Promise<unknown> {
            await ensureConnected();
            const timeout = isAIBoundTool(name) ? AI_TOOL_TIMEOUT_MS : TOOL_TIMEOUT_MS;
            const result = await client.callTool({ name, arguments: args }, undefined, { timeout });
            if ('isError' in result && result.isError) throw new Error(`Tool ${name} returned error`);
            if (!('content' in result)) return result;
            const first = (result.content as unknown[])[0] as Record<string, unknown> | undefined;
            return first && 'text' in first ? JSON.parse(first.text as string) : result;
        },

        async callPrompt(name: string, args: Record<string, string>): Promise<string> {
            await ensureConnected();
            const result = await client.getPrompt({ name, arguments: args }, { timeout: AI_TOOL_TIMEOUT_MS });
            return result.messages
                .filter(m => 'text' in m.content)
                .map(m => (m.content as { text: string }).text)
                .join('\n');
        },

        dispose(): void {
            transport.close().catch(() => {});
        },
    };
}
