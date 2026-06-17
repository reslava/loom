import { resolveDocIdOrThrow, loadDoc, saveDoc } from '../../../fs/dist';
import { Document, parseStepsTable, today } from '../../../core/dist';

export const toolDef = {
    name: 'loom_update_doc',
    description: 'Update an existing document — replace its markdown body, set its status, and/or set its requires_load. Frontmatter is otherwise preserved and version is incremented. Use this tool to update Loom docs — do not edit weave files directly.',
    inputSchema: {
        type: 'object' as const,
        properties: {
            id: { type: 'string', description: 'Document id to update' },
            content: { type: 'string', description: 'New markdown body (no frontmatter). Omit to leave body unchanged.' },
            status: { type: 'string', description: 'New status value (e.g. "done", "active", "draft"). Omit to leave status unchanged.' },
            requires_load: { type: 'array', items: { type: 'string' }, description: 'Replacement requires_load array. Omit to leave unchanged.' },
        },
        required: ['id'],
    },
};

export async function handle(root: string, args: Record<string, unknown>) {
    const id = args['id'] as string;
    const newContent = args['content'] as string | undefined;
    const newStatus = args['status'] as string | undefined;
    const newRequiresLoad = Array.isArray(args['requires_load']) ? (args['requires_load'] as string[]) : undefined;

    if (!newContent && !newStatus && newRequiresLoad === undefined) {
        throw new Error('At least one of content, status, or requires_load must be provided');
    }

    const { id: resolvedId, filePath } = await resolveDocIdOrThrow(root, id);

    const doc = await loadDoc(filePath) as Document;
    const content = newContent ?? (doc as any).content ?? '';
    // For a frontmatter-native plan, steps live in frontmatter and the body table is a
    // generated view — a body edit must NOT silently re-derive steps. Only a legacy
    // (body-backed) plan still parses its steps from the body table.
    const isLegacyPlan = doc.type === 'plan' && (doc as any)._stepsFromFrontmatter !== true;

    const updated: Document = {
        ...doc,
        ...(newStatus ? { status: newStatus as any } : {}),
        ...(newRequiresLoad !== undefined ? { requires_load: newRequiresLoad } : {}),
        version: doc.version + 1,
        updated: today(),
        content,
        ...(isLegacyPlan ? { steps: parseStepsTable(content) } : {}),
    } as Document;

    await saveDoc(updated, filePath);
    return { content: [{ type: 'text' as const, text: JSON.stringify({ id: resolvedId, filePath }) }] };
}
