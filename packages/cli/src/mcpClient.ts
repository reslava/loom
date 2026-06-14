import { Client } from '@modelcontextprotocol/sdk/client/index.js';
import { InMemoryTransport } from '@modelcontextprotocol/sdk/inMemory.js';
import { createLoomMcpServer } from '../../mcp/dist/server';
import { closeStateCache } from '../../mcp/dist/stateCache';

/**
 * In-process MCP client for the CLI delivery layer.
 *
 * The MCP surface (loom://catalog, loom://context/..., the do-next-step prompt) is
 * normally reachable only from an MCP host. To make it reachable from a plain
 * terminal *without* spawning `loom mcp` and hand-typing the JSON-RPC handshake, we
 * instantiate the same server in-process and talk to it over an in-memory transport
 * pair (shipped by the MCP SDK). The handshake (initialize + notifications/initialized)
 * still happens — Client.connect() runs it — but inside one process, hidden from the
 * user. No subprocess, no stdio framing, no LOOM_ROOT juggling.
 */
export interface LocalMcpClient {
    /** Read a resource and return its concatenated text contents. */
    readResource(uri: string): Promise<string>;
    /** List the concrete resources the server advertises (uri + human title). */
    listResources(): Promise<Array<{ uri: string; title: string }>>;
    /** Invoke a prompt and return its concatenated text messages. */
    getPrompt(name: string, args?: Record<string, string>): Promise<string>;
    /** Tear down the client + server and their transports. */
    close(): Promise<void>;
}

/**
 * Build the Loom MCP server for `root`, connect an in-memory client to it, run the
 * handshake, and return a thin façade. Always pair a call with `close()` (use
 * try/finally) so the transports are released and the process can exit.
 */
export async function connectLocalMcp(root: string): Promise<LocalMcpClient> {
    const server = createLoomMcpServer(root);
    const [clientTransport, serverTransport] = InMemoryTransport.createLinkedPair();
    await server.connect(serverTransport);

    const client = new Client(
        { name: 'loom-cli', version: '1.0.0' },
        { capabilities: {} }
    );
    // connect() performs initialize + notifications/initialized over the transport.
    await client.connect(clientTransport);

    return {
        async readResource(uri: string): Promise<string> {
            const res = await client.readResource({ uri });
            return res.contents
                .map((c) => ('text' in c && typeof c.text === 'string' ? c.text : ''))
                .join('\n');
        },

        async listResources(): Promise<Array<{ uri: string; title: string }>> {
            const res = await client.listResources();
            return res.resources.map((r) => ({ uri: r.uri, title: r.title ?? r.name }));
        },

        async getPrompt(name: string, args?: Record<string, string>): Promise<string> {
            const res = await client.getPrompt({ name, arguments: args ?? {} });
            return res.messages
                .map((m) => (m.content.type === 'text' ? m.content.text : ''))
                .join('\n');
        },

        async close(): Promise<void> {
            await client.close();
            await server.close();
            // Tear down the state-cache fs.watch watcher — otherwise it keeps the
            // CLI's Node event loop alive and the process never exits (hang).
            closeStateCache();
        },
    };
}
