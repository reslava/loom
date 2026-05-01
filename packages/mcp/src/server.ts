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
import { handleDocsResource } from './resources/docs';
import { handleThreadContextResource } from './resources/threadContext';
import { handlePlanResource } from './resources/plan';
import { handleRequiresLoadResource } from './resources/requiresLoad';
import * as createIdea from './tools/createIdea';
import * as createDesign from './tools/createDesign';
import * as createPlan from './tools/createPlan';
import * as updateDoc from './tools/updateDoc';
import * as appendToChat from './tools/appendToChat';
import * as createChat from './tools/createChat';
import * as startPlan from './tools/startPlan';
import * as completeStep from './tools/completeStep';
import * as closePlan from './tools/closePlan';
import * as promote from './tools/promote';
import * as finalizeDoc from './tools/finalizeDoc';
import * as archive from './tools/archive';
import * as rename from './tools/rename';
import * as findDoc from './tools/findDoc';
import * as searchDocs from './tools/searchDocs';
import * as getBlockedSteps from './tools/getBlockedSteps';
import * as getStalePlans from './tools/getStalePlans';
import * as getStaleDocs from './tools/getStaleDocs';
import { createGenerateTools } from './tools/generate';
import { createRefreshCtxTool } from './tools/refreshCtx';
import * as doStep from './tools/doStep';
import * as appendDone from './tools/appendDone';
import * as listPlanSteps from './tools/listPlanSteps';
import * as continueThread from './prompts/continueThread';
import * as doNextStep from './prompts/doNextStep';
import * as refineDesign from './prompts/refineDesign';
import * as weaveIdea from './prompts/weaveIdea';
import * as weaveDesign from './prompts/weaveDesign';
import * as weavePlan from './prompts/weavePlan';
import * as validateState from './prompts/validateState';

const BASE_TOOLS = [
    createIdea, createDesign, createPlan, updateDoc, appendToChat, createChat,
    startPlan, completeStep, closePlan, promote, finalizeDoc, archive, rename,
    findDoc, searchDocs, getBlockedSteps, getStalePlans, getStaleDocs,
    doStep, appendDone, listPlanSteps,
];

const PROMPTS = [
    continueThread, doNextStep, refineDesign, weaveIdea, weaveDesign, weavePlan, validateState,
];

export function createLoomMcpServer(root: string): Server {
    const server = new Server(
        { name: 'loom', version: '0.4.0' },
        { capabilities: { resources: {}, tools: {}, prompts: {} } }
    );

    const TOOLS = [
        ...BASE_TOOLS,
        ...createGenerateTools(server),
        createRefreshCtxTool(server),
    ];

    server.setRequestHandler(ListResourcesRequestSchema, async () => ({
        resources: [
            { uri: 'loom://state', name: 'Loom State', description: 'Full project state (weaves, threads, plans)', mimeType: 'application/json' },
            { uri: 'loom://status', name: 'Loom Status', description: 'Raw .loom/_status.md content (Stage 1 only)', mimeType: 'text/plain' },
            { uri: 'loom://link-index', name: 'Link Index', description: 'Document graph (parent_id / child_ids)', mimeType: 'application/json' },
            { uri: 'loom://diagnostics', name: 'Diagnostics', description: 'Broken links, orphaned docs', mimeType: 'application/json' },
            { uri: 'loom://summary', name: 'Summary', description: 'Project health counts', mimeType: 'application/json' },
            { uri: 'loom://docs/{id}', name: 'Document', description: 'Raw markdown of any Loom document by id', mimeType: 'text/plain' },
            { uri: 'loom://thread-context/{weaveId}/{threadId}', name: 'Thread Context', description: 'Bundled context for a thread: ctx summary, idea, design, active plan, requires_load refs', mimeType: 'text/plain' },
            { uri: 'loom://plan/{id}', name: 'Plan', description: 'Plan document with parsed steps table as JSON', mimeType: 'application/json' },
            { uri: 'loom://requires-load/{id}', name: 'Requires Load', description: 'All docs listed in requires_load for a document (recursive, deduplicated)', mimeType: 'application/json' },
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
        if (uri.startsWith('loom://docs/')) {
            return handleDocsResource(root, uri);
        }
        if (uri.startsWith('loom://thread-context/')) {
            return handleThreadContextResource(root, uri);
        }
        if (uri.startsWith('loom://plan/')) {
            return handlePlanResource(root, uri);
        }
        if (uri.startsWith('loom://requires-load/')) {
            return handleRequiresLoadResource(root, uri);
        }
        throw new Error(`Unknown resource URI: ${uri}`);
    });

    server.setRequestHandler(ListToolsRequestSchema, async () => ({
        tools: TOOLS.map(t => t.toolDef),
    }));

    server.setRequestHandler(CallToolRequestSchema, async (request) => {
        const { name, arguments: args } = request.params;
        const tool = TOOLS.find(t => t.toolDef.name === name);
        if (!tool) {
            throw new Error(`Unknown tool: ${name}`);
        }
        return tool.handle(root, (args ?? {}) as Record<string, unknown>);
    });

    server.setRequestHandler(ListPromptsRequestSchema, async () => ({
        prompts: PROMPTS.map(p => p.promptDef),
    }));

    server.setRequestHandler(GetPromptRequestSchema, async (request) => {
        const { name, arguments: args } = request.params;
        const prompt = PROMPTS.find(p => p.promptDef.name === name);
        if (!prompt) {
            throw new Error(`Unknown prompt: ${name}`);
        }
        return prompt.handle(root, (args ?? {}) as Record<string, string | undefined>);
    });

    return server;
}
