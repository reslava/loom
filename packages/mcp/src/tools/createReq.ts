import * as fs from 'fs-extra';
import { getActiveLoomRoot, saveDoc, loadDoc } from '../../../fs/dist';
import { createReq } from '../../../app/dist/req';

export const toolDef = {
    name: 'loom_create_req',
    description:
        "Create a thread's req (requirements) doc — the authoritative include/exclude/constraints spec, one flat `req.md` per thread. **Pass `content` to write the three ID'd lists in this same call** (the safe, faithful extraction of what the user explicitly stated in chat) so the doc is born at version 1 with real content. Body shape: `### ✅ Included` / `### ❌ Excluded` / `### ⛓ Constraints`, each bullet prefixed with an inline-code stable id (`IN1`, `EX1`, `C1`). The doc is created at status \"draft\" — lock it with loom_finalize_req. Use this tool to create a req doc — do not edit weave files directly.",
    inputSchema: {
        type: 'object' as const,
        properties: {
            weaveId: { type: 'string', description: 'Target weave id' },
            threadId: { type: 'string', description: 'Thread id inside the weave' },
            title: { type: 'string', description: 'Optional title override (defaults to "{idea title} — Requirements")' },
            content: { type: 'string', description: "Markdown body (no frontmatter): the three ID'd lists. Provide on creation so the doc is born at v1 with real content." },
        },
        required: ['weaveId', 'threadId'],
    },
};

export async function handle(root: string, args: Record<string, unknown>) {
    const result = await createReq(
        {
            weaveId: args['weaveId'] as string,
            threadId: args['threadId'] as string,
            title: args['title'] as string | undefined,
            content: args['content'] as string | undefined,
        },
        { getActiveLoomRoot: () => getActiveLoomRoot(root), saveDoc, loadDoc, fs },
    );
    return { content: [{ type: 'text' as const, text: JSON.stringify(result) }] };
}
