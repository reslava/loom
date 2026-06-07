import { Server } from '@modelcontextprotocol/sdk/server/index.js';
import {
    ReadResourceRequestSchema,
    ListResourcesRequestSchema,
    ListResourceTemplatesRequestSchema,
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
import { handleContextResource } from './resources/context';
import { handlePlanResource } from './resources/plan';
import { handleRequiresLoadResource } from './resources/requiresLoad';
import * as createIdea from './tools/createIdea';
import * as createDesign from './tools/createDesign';
import * as createPlan from './tools/createPlan';
import * as createReq from './tools/createReq';
import * as refineReq from './tools/refineReq';
import * as finalizeReq from './tools/finalizeReq';
import * as updateDoc from './tools/updateDoc';
import * as appendToChat from './tools/appendToChat';
import * as createChat from './tools/createChat';
import * as startPlan from './tools/startPlan';
import * as completeStep from './tools/completeStep';
import * as closePlan from './tools/closePlan';
import { createPromoteTool } from './tools/promote';
import { createRefineIdeaTool } from './tools/refineIdea';
import { createRefinePlanTool } from './tools/refinePlan';
import { createRefineDesignTool } from './tools/refineDesign';
import * as finalizeDoc from './tools/finalizeDoc';
import * as archive from './tools/archive';
import * as rename from './tools/rename';
import * as findDoc from './tools/findDoc';
import * as searchDocs from './tools/searchDocs';
import * as getBlockedSteps from './tools/getBlockedSteps';
import * as getStalePlans from './tools/getStalePlans';
import * as getStaleDocs from './tools/getStaleDocs';
import { createGenerateTools } from './tools/generate';
import { createVerifyReqTool } from './tools/verifyReq';
import { createRefreshCtxTool } from './tools/refreshCtx';
import * as doStep from './tools/doStep';
import * as appendDone from './tools/appendDone';
import * as listPlanSteps from './tools/listPlanSteps';
import * as createReference from './tools/createReference';
import * as setContextPrefs from './tools/setContextPrefs';
import * as getContextPrefs from './tools/getContextPrefs';
import { buildToolCatalog, registerToolCatalog, getToolCatalogBlock } from './catalog';
import * as continueThread from './prompts/continueThread';
import * as doNextStep from './prompts/doNextStep';
import * as refineDesign from './prompts/refineDesign';
import * as weaveIdea from './prompts/weaveIdea';
import * as weaveDesign from './prompts/weaveDesign';
import * as weavePlan from './prompts/weavePlan';
import * as validateState from './prompts/validateState';

// A registered tool: its wire definition + handler, tagged with a discovery `group`.
// `group` is a sibling of `toolDef` (never sent over the wire in ListTools) and is the
// single source the loom://catalog resource groups by — assigned here at the registry,
// the one place a tool is added, so it can't drift.
interface ToolModule {
    toolDef: { name: string; description: string; inputSchema: object };
    handle: (root: string, args: Record<string, unknown>) => Promise<{ content: Array<{ type: 'text'; text: string }> }>;
}
type GroupedTool = ToolModule & { group: string };

function reg(group: string, mods: ToolModule[]): GroupedTool[] {
    return mods.map(m => ({ toolDef: m.toolDef, handle: m.handle, group }));
}

const PROMPTS = [
    continueThread, doNextStep, refineDesign, weaveIdea, weaveDesign, weavePlan, validateState,
];

const CONCRETE_RESOURCES = [
    { uri: 'loom://state', name: 'Loom State', description: 'Full project state (weaves, threads, plans)', mimeType: 'application/json' },
    { uri: 'loom://status', name: 'Loom Status', description: 'Raw .loom/_status.md content (Stage 1 only)', mimeType: 'text/plain' },
    { uri: 'loom://link-index', name: 'Link Index', description: 'Document graph: id→path (byId, documents), parent/child relationships, backlinks, slugs', mimeType: 'application/json' },
    { uri: 'loom://diagnostics', name: 'Diagnostics', description: 'Broken links, orphaned docs', mimeType: 'application/json' },
    { uri: 'loom://summary', name: 'Summary', description: 'Project health counts', mimeType: 'application/json' },
    { uri: 'loom://catalog', name: 'Tool Catalog', description: 'Grouped index of all loom_* MCP tools (name + one-line purpose). Read this BEFORE searching for a tool, then ToolSearch select:<exact name>.', mimeType: 'text/markdown' },
];

const RESOURCE_TEMPLATES = [
    { uriTemplate: 'loom://docs/{id}', name: 'Document', description: 'Raw markdown of any Loom document by id', mimeType: 'text/plain' },
    { uriTemplate: 'loom://context/{docId}', name: 'Context Bundle', description: 'Unified context pipeline: global/weave/thread ctx + parent chain + requires_load for a target doc. Forms: loom://context/{docId} or loom://context/thread/{weaveId}/{threadId}. Append ?mode={chat|idea|design|plan|implementing|refine|promote|ctx}', mimeType: 'text/plain' },
    { uriTemplate: 'loom://plan/{id}', name: 'Plan', description: 'Plan document with parsed steps table as JSON', mimeType: 'application/json' },
    { uriTemplate: 'loom://requires-load/{id}', name: 'Requires Load', description: 'All docs listed in requires_load for a document (recursive, deduplicated)', mimeType: 'application/json' },
];

export function createLoomMcpServer(root: string): Server {
    const server = new Server(
        { name: 'loom', version: '1.1.0' },
        { capabilities: { resources: {}, tools: {}, prompts: {} } }
    );

    const TOOLS: GroupedTool[] = [
        ...reg('create', [createIdea, createDesign, createPlan, createReq, createReference, createChat]),
        ...reg('doc', [updateDoc, finalizeDoc, archive, rename, createPromoteTool(server)]),
        ...reg('refine', [refineReq, createRefineIdeaTool(server), createRefinePlanTool(server), createRefineDesignTool(server)]),
        ...reg('generate', createGenerateTools(server)),
        ...reg('plan', [startPlan, completeStep, closePlan, doStep, appendDone, listPlanSteps]),
        ...reg('req', [finalizeReq, createVerifyReqTool(server)]),
        ...reg('chat', [appendToChat]),
        ...reg('context', [setContextPrefs, getContextPrefs, createRefreshCtxTool()]),
        ...reg('query', [findDoc, searchDocs, getBlockedSteps, getStalePlans, getStaleDocs]),
    ];

    // Build the discovery catalog once from the live registry (static for this server).
    registerToolCatalog(buildToolCatalog(TOOLS));

    server.setRequestHandler(ListResourcesRequestSchema, async () => ({
        resources: CONCRETE_RESOURCES,
    }));

    server.setRequestHandler(ListResourceTemplatesRequestSchema, async () => ({
        resourceTemplates: RESOURCE_TEMPLATES,
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
        if (uri === 'loom://catalog') {
            return { contents: [{ uri, mimeType: 'text/markdown', text: getToolCatalogBlock() }] };
        }
        if (uri.startsWith('loom://docs/')) {
            return handleDocsResource(root, uri);
        }
        if (uri.startsWith('loom://context/')) {
            return handleContextResource(root, uri);
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
