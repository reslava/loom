import * as fs from 'fs-extra';
import { Server } from '@modelcontextprotocol/sdk/server/index.js';
import { loadDoc, saveDoc, resolveDocIdOrThrow } from '../../../fs/dist';
import { promoteToIdea } from '../../../app/dist/promoteToIdea';
import { promoteToDesign } from '../../../app/dist/promoteToDesign';
import { promoteToPlan } from '../../../app/dist/promoteToPlan';
import { samplingAiClient } from '../samplingAiClient';

const toolDef = {
    name: 'loom_promote',
    description: 'Promote a document to a new type (idea, design, or plan), creating a new doc linked to the source. Pass `body` to write the content yourself (skips MCP sampling) — this is the path to use in Claude Code, where server→client sampling is unavailable. Omit `body` to have the host generate it via sampling (VS Code / sampling-capable hosts only). For target type "plan" the body must contain a Steps table or a numbered Steps list.',
    inputSchema: {
        type: 'object' as const,
        properties: {
            source_ulid: { type: 'string', description: 'Source document ULID' },
            targetType: { type: 'string', enum: ['idea', 'design', 'plan'], description: 'Target document type' },
            target_weave_slug: { type: 'string', description: 'Optional target weave folder slug (required when promoting from a global-level chat)' },
            target_thread_ulid: { type: 'string', description: 'Optional target thread ULID within the target weave' },
            title: { type: 'string', description: 'Optional title for the new doc (used with `body`). Defaults to the source doc title.' },
            body: { type: 'string', description: 'Optional inline markdown body (no frontmatter). When provided, sampling is skipped and this is written directly. Required in Claude Code sessions.' },
        },
        required: ['source_ulid', 'targetType'],
    },
};

export function createPromoteTool(server: Server) {
    return {
        toolDef,
        async handle(root: string, args: Record<string, unknown>) {
            const sourceUlid = args['source_ulid'] as string;
            const targetType = args['targetType'] as 'idea' | 'design' | 'plan';
            const targetWeaveSlug = args['target_weave_slug'] as string | undefined;
            const targetThreadUlid = args['target_thread_ulid'] as string | undefined;
            const title = args['title'] as string | undefined;
            const body = args['body'] as string | undefined;

            const { filePath } = await resolveDocIdOrThrow(root, sourceUlid);

            const deps = { loadDoc, saveDoc, fs, aiClient: samplingAiClient(server), loomRoot: root };
            const target = { targetWeaveSlug, targetThreadUlid, title, body };

            let result: { filePath: string; title: string };
            if (targetType === 'idea') {
                result = await promoteToIdea({ filePath, ...target }, deps);
            } else if (targetType === 'design') {
                result = await promoteToDesign({ filePath, ...target }, deps);
            } else {
                result = await promoteToPlan({ filePath, ...target }, deps);
            }

            return { content: [{ type: 'text' as const, text: JSON.stringify(result) }] };
        },
    };
}
