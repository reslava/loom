import { loadDoc, saveDoc, getActiveLoomRoot, findDocumentById, resolveDocIdOrThrow } from '../../../fs/dist';
import { setStatus } from '../../../app/dist/setStatus';

export const toolDef = {
    name: 'loom_set_status',
    description: 'Set a document\'s lifecycle status (e.g. draft → active → done) — the single status verb for plain docs (idea/design/ctx/reference). Guarded: it refuses transitions a dedicated tool owns and names it — a plan → implementing needs loom_start_plan, a plan → done needs loom_close_plan ("done" is earned by completing steps, not set), a req → locked needs loom_finalize_req. No version bump (a status change is lifecycle, not a spec edit). Use this tool to change a doc\'s status — do not edit files directly.',
    inputSchema: {
        type: 'object' as const,
        properties: {
            doc_ulid: { type: 'string', description: 'ULID of the document whose status to set.' },
            status: { type: 'string', description: 'Target status, e.g. "active", "done", "draft".' },
        },
        required: ['doc_ulid', 'status'],
    },
};

export async function handle(root: string, args: Record<string, unknown>) {
    const docUlid = args['doc_ulid'] as string;
    const status = args['status'] as string;

    // Resolve stems/typos to the canonical id at the delivery boundary (suggest-on-miss),
    // then hand the resolved id to the use-case.
    const { id: resolvedId } = await resolveDocIdOrThrow(root, docUlid);

    const result = await setStatus({ docUlid: resolvedId, status }, {
        loadDoc,
        saveDoc,
        getActiveLoomRoot: () => getActiveLoomRoot(root),
        findDocumentById,
    });

    return { content: [{ type: 'text' as const, text: JSON.stringify(result) }] };
}
