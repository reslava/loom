import { resolveDocIdOrThrow, loadDoc, saveDoc } from '../../../fs/dist';
import { Document, parseStepsTable, today } from '../../../core/dist';

export const toolDef = {
    name: 'loom_update_doc',
    description: 'Update an existing document — replace its markdown body and/or set its requires_load. Frontmatter is otherwise preserved and version is incremented when content changes. Status changes go through loom_set_status (not this tool). Use this tool to update Loom docs — do not edit weave files directly.',
    inputSchema: {
        type: 'object' as const,
        properties: {
            id: { type: 'string', description: 'Document id to update' },
            content: { type: 'string', description: 'New markdown body (no frontmatter). Omit to leave body unchanged.' },
            requires_load: { type: 'array', items: { type: 'string' }, description: 'Replacement requires_load array. Omit to leave unchanged.' },
        },
        required: ['id'],
    },
};

export async function handle(root: string, args: Record<string, unknown>) {
    const id = args['id'] as string;
    const newContent = args['content'] as string | undefined;
    const newRequiresLoad = Array.isArray(args['requires_load']) ? (args['requires_load'] as string[]) : undefined;

    if (!newContent && newRequiresLoad === undefined) {
        throw new Error('At least one of content or requires_load must be provided (status changes go through loom_set_status)');
    }

    const { id: resolvedId, filePath } = await resolveDocIdOrThrow(root, id);

    const doc = await loadDoc(filePath) as Document;
    const currentContent = (doc as any).content ?? '';
    const content = newContent ?? currentContent;
    // For a frontmatter-native plan, steps live in frontmatter and the body table is a
    // generated view — a body edit must NOT silently re-derive steps. Only a legacy
    // (body-backed) plan still parses its steps from the body table.
    const isLegacyPlan = doc.type === 'plan' && (doc as any)._stepsFromFrontmatter !== true;

    // version + updated track SPEC revisions, which is what staleness reads. Bump them
    // only when the caller supplies new `content` (a content edit). A status-only or
    // requires_load-only update is a lifecycle change, not a spec change, and must NOT
    // bump either — else marking a parent done would cascade false staleness to its
    // children. (We can't reliably diff against the stored body — titled docs get an
    // injected H1 on save — so "content provided" is the signal.) See
    // loom/refs/staleness-reference.md.
    const contentChanged = newContent !== undefined;

    const updated: Document = {
        ...doc,
        ...(newRequiresLoad !== undefined ? { requires_load: newRequiresLoad } : {}),
        ...(contentChanged ? { version: doc.version + 1, updated: today() } : {}),
        content,
        ...(isLegacyPlan ? { steps: parseStepsTable(content) } : {}),
    } as Document;

    await saveDoc(updated, filePath);
    return { content: [{ type: 'text' as const, text: JSON.stringify({ id: resolvedId, filePath }) }] };
}
