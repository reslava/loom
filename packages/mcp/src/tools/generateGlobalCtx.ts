import * as path from 'path';
import * as fsExtra from 'fs-extra';
import { Server } from '@modelcontextprotocol/sdk/server/index.js';
import { handleStateResource } from '../resources/state';
import { requestSampling, SamplingMessage } from '../sampling';

const toolDef = {
    name: 'loom_generate_global_ctx',
    description: 'Generate or refresh the workspace-level loom/loom-ctx.md from current state using MCP sampling. Captures concept, architecture, active weaves, and operating rules so every session starts pre-loaded.',
    inputSchema: {
        type: 'object' as const,
        properties: {},
        required: [],
    },
};

const SYSTEM_PROMPT = `You are a Loom context summarizer. You are writing the workspace-level loom/loom-ctx.md doc that every Loom session reads at startup.
Output structure (markdown body only — no frontmatter, no surrounding code fences):

# Loom — Global Context

## 1. Concept
<2-3 short paragraphs: what THIS workspace is about, derived from the weaves you see — not the generic Loom-on-Loom story>

## 2. Active work
<bullet list of active weaves and their threads, with one-line status each>

## 3. Architecture
<short summary of the workspace layout and conventions you can infer>

## 4. Rules
<operating rules an AI agent should follow in THIS workspace, derived from any conventions visible in the state>

Be specific to the workspace data you receive. Do not produce generic Loom documentation — that already exists.`;

export function createGenerateGlobalCtxTool(server: Server) {
    return {
        toolDef,
        async handle(root: string, _args: Record<string, unknown>) {
            const stateResult = await handleStateResource(root, 'loom://state?status=active,implementing');
            const stateText = stateResult.contents[0]?.text ?? '{}';

            const messages: SamplingMessage[] = [
                {
                    role: 'user',
                    content: {
                        type: 'text',
                        text: `Workspace state JSON:\n\n${stateText}\n\nProduce the workspace-level loom-ctx.md body per the structure in the system prompt.`,
                    },
                },
            ];

            const body = await requestSampling(server, messages, SYSTEM_PROMPT, 4096);

            const ctxPath = path.join(root, 'loom', 'loom-ctx.md');
            const today = new Date().toISOString().split('T')[0];

            const existing = await fsExtra.pathExists(ctxPath)
                ? await fsExtra.readFile(ctxPath, 'utf8')
                : '';
            const versionMatch = existing.match(/^version:\s*(\d+)/m);
            const nextVersion = versionMatch ? Number(versionMatch[1]) + 1 : 1;

            const frontmatter = [
                '---',
                'type: ctx',
                'id: loom-ctx',
                'title: "Loom — Global Context"',
                'status: active',
                `created: ${today}`,
                `version: ${nextVersion}`,
                'tags: [ctx, vision, architecture, session-start]',
                'parent_id: null',
                'child_ids: []',
                'requires_load: []',
                'load: always',
                '---',
                '',
            ].join('\n');

            await fsExtra.ensureDir(path.dirname(ctxPath));
            await fsExtra.writeFile(ctxPath, `${frontmatter}${body.trim()}\n`, 'utf8');

            return { content: [{ type: 'text' as const, text: JSON.stringify({ filePath: ctxPath, version: nextVersion }) }] };
        },
    };
}
