import { setContextPrefs } from '../../../fs/dist';

export const toolDef = {
    name: 'loom_set_context_prefs',
    description:
        'Persist sidebar CONTEXT overrides for a target doc to .loom/context-prefs.json. Replace semantics: a provided include/exclude array replaces that stored list (an omitted list is preserved). reset:true clears all overrides for the target (back to auto). Returns the updated entry.',
    inputSchema: {
        type: 'object' as const,
        properties: {
            doc_ulid: { type: 'string', description: 'Target document ULID the overrides apply to' },
            include: {
                type: 'array',
                items: { type: 'string' },
                description: 'Doc ids to force-include (replaces the stored include list)',
            },
            exclude: {
                type: 'array',
                items: { type: 'string' },
                description: 'Doc ids to force-exclude (replaces the stored exclude list)',
            },
            reset: { type: 'boolean', description: 'If true, remove all overrides for this target' },
        },
        required: ['doc_ulid'],
    },
};

export async function handle(root: string, args: Record<string, unknown>) {
    const docUlid = args['doc_ulid'] as string;
    if (!docUlid) throw new Error('doc_ulid is required');
    const include = Array.isArray(args['include']) ? (args['include'] as string[]) : undefined;
    const exclude = Array.isArray(args['exclude']) ? (args['exclude'] as string[]) : undefined;
    const reset = args['reset'] === true;

    const prefs = await setContextPrefs(root, docUlid, { include, exclude, reset });
    const entry = prefs[docUlid] ?? { include: [], exclude: [] };
    return { content: [{ type: 'text' as const, text: JSON.stringify({ docUlid, entry }) }] };
}
