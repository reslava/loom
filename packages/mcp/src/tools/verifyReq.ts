import * as fs from 'fs-extra';
import { Server } from '@modelcontextprotocol/sdk/server/index.js';
import { getActiveLoomRoot, loadWeave, buildLinkIndex, loadDoc } from '../../../fs/dist';
import { resolveThreadFolder } from '../../../app/dist';
import { parseReq, checkReqCoverage } from '../../../core/dist';
import { requestSampling, SamplingMessage } from '../sampling';

function msg(role: 'user' | 'assistant', text: string): SamplingMessage {
    return { role, content: { type: 'text', text } };
}

type ToolModule = {
    toolDef: { name: string; description: string; inputSchema: object };
    handle: (root: string, args: Record<string, unknown>) => Promise<{ content: Array<{ type: 'text'; text: string }> }>;
};

/**
 * loom_verify_req — verify a thread's plan against its locked req.
 *
 * Two layers: a pure deterministic scope-coverage check (always), plus an AI
 * semantic pass via sampling that catches violations phrased differently than
 * the requirement text. Sampling works in the VS Code extension; in a Claude
 * Code CLI session it is blocked (MethodNotFound) — the structural findings are
 * returned and the agent is expected to judge the semantic part itself.
 */
export function createVerifyReqTool(server: Server): ToolModule {
    return {
        toolDef: {
            name: 'loom_verify_req',
            description:
                "Verify a thread's plan against its locked req: a deterministic scope-coverage check (uncovered Included, Excluded citations, dangling citations) plus, where sampling is available, an AI semantic pass flagging steps that violate an Excluded item / Constraint or advance an Included item without citing it — even when phrased differently. In a Claude Code CLI session sampling is blocked; the structural findings are returned and the agent should judge the semantic part itself.",
            inputSchema: {
                type: 'object' as const,
                properties: {
                    weave_slug: { type: 'string', description: 'Weave folder slug' },
                    thread_ulid: { type: 'string', description: 'Stable th_ ULID of the thread' },
                },
                required: ['weave_slug', 'thread_ulid'],
            },
        },
        handle: async (root, args) => {
            const weaveSlug = args['weave_slug'] as string;
            const threadUlid = args['thread_ulid'] as string;

            const loomRoot = getActiveLoomRoot(root);
            // Reference the thread by its stable ULID → resolve to the folder slug (the Thread entity's id).
            const { threadSlug } = await resolveThreadFolder(weaveSlug, threadUlid, { getActiveLoomRoot: () => loomRoot, loadDoc, fs });
            const index = await buildLinkIndex(loomRoot);
            const weave = await loadWeave(loomRoot, weaveSlug, index);
            const thread = weave?.threads.find((t: { id: string }) => t.id === threadSlug);
            if (!thread) throw new Error(`Thread not found: ${weaveSlug}/${threadSlug}`);

            if (!thread.req || thread.req.status !== 'locked') {
                return wrap({ weaveSlug, threadUlid, ok: false, reason: 'thread has no locked req to verify against' });
            }

            const parsed = parseReq(thread.req.content ?? '');
            const steps: Array<{ order: number; description: string; satisfies?: string[] }> =
                thread.plans.flatMap((p: { steps?: unknown[] }) => (p.steps ?? []) as Array<{ order: number; description: string; satisfies?: string[] }>);

            // Deterministic structural coverage (works everywhere).
            const structural = checkReqCoverage(parsed, steps as never);

            // Semantic backstop (sampling — extension only; blocked in CLI).
            let semantic: unknown = null;
            let semanticError: string | null = null;
            try {
                const planText = steps
                    .map(s => `- step ${s.order} [cites: ${(s.satisfies ?? []).join(', ') || 'none'}] ${s.description}`)
                    .join('\n');
                const out = await requestSampling(
                    server,
                    [msg('user', [
                        'Locked requirements (the authoritative spec):',
                        thread.req.content ?? '',
                        '',
                        'Plan steps (with the requirement ids each cites):',
                        planText,
                        '',
                        'Judge SCOPE FAITHFULNESS only — not code correctness. Flag:',
                        '- any step that implements an ❌ Excluded item or breaks a ⛓ Constraint, even if worded differently;',
                        '- any step that clearly advances a ✅ Included item without citing its id.',
                        'Return ONLY JSON: {"violations":[{"stepOrder":1,"requirement":"EX1","why":"..."}],"uncited":[{"stepOrder":1,"requirement":"IN1"}]} — empty arrays if none.',
                    ].join('\n'))],
                    'You are a Loom requirements verifier. Judge only whether the plan honours the include/exclude/constraints spec. Be precise and conservative; do not invent violations.',
                );
                try {
                    const m = out.match(/\{[\s\S]*\}/);
                    semantic = m ? JSON.parse(m[0]) : { raw: out };
                } catch {
                    semantic = { raw: out };
                }
            } catch (e) {
                semanticError = e instanceof Error ? e.message : String(e);
            }

            return wrap({ weaveSlug, threadUlid, structural, semantic, semanticError });
        },
    };
}

function wrap(payload: unknown): { content: Array<{ type: 'text'; text: string }> } {
    return { content: [{ type: 'text' as const, text: JSON.stringify(payload) }] };
}
