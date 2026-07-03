import * as fs from 'fs-extra';
import { getActiveLoomRoot, saveDoc, loadDoc } from '../../../fs/dist';
import { amendReq } from '../../../app/dist/req';

export const toolDef = {
    name: 'loom_amend_req',
    description:
        "Amend a thread's req under append-only rules: reconcile new/changed requirements into the spec, re-open it to \"draft\", and bump the version (a bump marks downstream idea/design/plan stale). Requirement handles (`IN`/`EX`/`C`) are immutable citation targets — this tool **refuses** any body that deletes or renumbers an existing handle. Append fresh handles for new scope; retire an obsolete one by marking it `~dropped` (which keeps the handle present and citation-resolvable), never by deleting it. Use this tool to edit an existing req — do not edit weave files directly.",
    inputSchema: {
        type: 'object' as const,
        properties: {
            weave_slug: { type: 'string', description: 'Target weave folder slug' },
            thread_ulid: { type: 'string', description: 'Stable th_ ULID of the thread inside the weave' },
            content: { type: 'string', description: 'New markdown body (append-only on handles). Omit to leave the body unchanged (a pure re-open).' },
        },
        required: ['weave_slug', 'thread_ulid'],
    },
};

export async function handle(root: string, args: Record<string, unknown>) {
    try {
        const result = await amendReq(
            {
                weaveSlug: args['weave_slug'] as string,
                threadUlid: args['thread_ulid'] as string,
                content: args['content'] as string | undefined,
            },
            { getActiveLoomRoot: () => getActiveLoomRoot(root), saveDoc, loadDoc, fs },
        );
        return { content: [{ type: 'text' as const, text: JSON.stringify(result) }] };
    } catch (e) {
        // Surface a handle-integrity violation as a clean finding, not a crash.
        const message = e instanceof Error ? e.message : String(e);
        return { content: [{ type: 'text' as const, text: JSON.stringify({ ok: false, error: message }) }] };
    }
}
