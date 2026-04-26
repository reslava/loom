import { Server } from '@modelcontextprotocol/sdk/server/index.js';
import {
    ReadResourceRequestSchema,
    ListResourcesRequestSchema,
    ListToolsRequestSchema,
    CallToolRequestSchema,
    ListPromptsRequestSchema,
    GetPromptRequestSchema,
} from '@modelcontextprotocol/sdk/types.js';
import { handleStateResource } from './resources/state';
import { handleStatusResource } from './resources/status';
import { handleLinkIndexResource } from './resources/linkIndex';
import { handleDiagnosticsResource } from './resources/diagnostics';
import { handleSummaryResource } from './resources/summary';

export function createLoomMcpServer(root: string): Server {
    const server = new Server(
        { name: 'loom', version: '0.4.0' },
        { capabilities: { resources: {}, tools: {}, prompts: {} } }
    );

    server.setRequestHandler(ListResourcesRequestSchema, async () => ({
        resources: [
            { uri: 'loom://state', name: 'Loom State', description: 'Full project state (weaves, threads, plans)', mimeType: 'application/json' },
            { uri: 'loom://status', name: 'Loom Status', description: 'Raw .loom/_status.md content (Stage 1 only)', mimeType: 'text/plain' },
            { uri: 'loom://link-index', name: 'Link Index', description: 'Document graph (parent_id / child_ids)', mimeType: 'application/json' },
            { uri: 'loom://diagnostics', name: 'Diagnostics', description: 'Broken links, orphaned docs', mimeType: 'application/json' },
            { uri: 'loom://summary', name: 'Summary', description: 'Project health counts', mimeType: 'application/json' },
        ],
    }));

    server.setRequestHandler(ReadResourceRequestSchema, async (request) => {
        const uri = request.params.uri;
        if (uri === 'loom://state' || uri.startsWith('loom://state?')) {
            return handleStateResource(root, uri);
        }
        if (uri === 'loom://status') {
            return handleStatusResource(root);
        }
        if (uri === 'loom://link-index') {
            return handleLinkIndexResource(root);
        }
        if (uri === 'loom://diagnostics') {
            return handleDiagnosticsResource(root);
        }
        if (uri === 'loom://summary') {
            return handleSummaryResource(root);
        }
        throw new Error(`Unknown resource URI: ${uri}`);
    });

    // Tools (Phase 4-6 — not yet implemented)
    server.setRequestHandler(ListToolsRequestSchema, async () => ({ tools: [] }));
    server.setRequestHandler(CallToolRequestSchema, async () => ({
        content: [{ type: 'text' as const, text: 'No tools implemented yet.' }],
    }));

    // Prompts (Phase 7 — not yet implemented)
    server.setRequestHandler(ListPromptsRequestSchema, async () => ({ prompts: [] }));
    server.setRequestHandler(GetPromptRequestSchema, async () => ({
        description: 'Not implemented',
        messages: [],
    }));

    return server;
}
