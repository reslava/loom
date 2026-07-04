import { readContextPrefsEntry } from '../../../fs/dist';

export const toolDef = {
    name: 'loom_get_context_prefs',
    description:
        'Read the persisted sidebar CONTEXT overrides for a target doc from .loom/context-prefs.json. Returns { docUlid, entry: { include, exclude } } (empty arrays when none are set).',
    inputSchema: {
        type: 'object' as const,
        properties: {
            doc_ulid: { type: 'string', description: 'Target document ULID' },
        },
        required: ['doc_ulid'],
    },
};

export async function handle(root: string, args: Record<string, unknown>) {
    const docUlid = args['doc_ulid'] as string;
    if (!docUlid) throw new Error('doc_ulid is required');
    const entry = await readContextPrefsEntry(root, docUlid);
    return { content: [{ type: 'text' as const, text: JSON.stringify({ docUlid, entry }) }] };
}
