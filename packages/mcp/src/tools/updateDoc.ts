import { resolveDocIdOrThrow, loadDoc, saveDoc } from '../../../fs/dist';
import { Document, parseStepsTable, today } from '../../../core/dist';

export const toolDef = {
    name: 'loom_update_doc',
    description: 'Update an existing document — replace its markdown body, set its status, set its requires_load, and/or set a design\'s target_release. Frontmatter is otherwise preserved and version is incremented. Use this tool to update Loom docs — do not edit weave files directly.',
    inputSchema: {
        type: 'object' as const,
        properties: {
            id: { type: 'string', description: 'Document id to update' },
            content: { type: 'string', description: 'New markdown body (no frontmatter). Omit to leave body unchanged.' },
            status: { type: 'string', description: 'New status value (e.g. "done", "active", "draft"). Omit to leave status unchanged.' },
            requires_load: { type: 'array', items: { type: 'string' }, description: 'Replacement requires_load array. Omit to leave unchanged.' },
            target_release: { type: 'string', description: 'Target release for a design doc (e.g. "1.4.0"). Only meaningful on type:design. Omit to leave unchanged.' },
        },
        required: ['id'],
    },
};

export async function handle(root: string, args: Record<string, unknown>) {
    const id = args['id'] as string;
    const newContent = args['content'] as string | undefined;
    const newStatus = args['status'] as string | undefined;
    const newRequiresLoad = Array.isArray(args['requires_load']) ? (args['requires_load'] as string[]) : undefined;
    const newTargetRelease = args['target_release'] as string | undefined;

    if (!newContent && !newStatus && newRequiresLoad === undefined && newTargetRelease === undefined) {
        throw new Error('At least one of content, status, requires_load, or target_release must be provided');
    }

    const { id: resolvedId, filePath } = await resolveDocIdOrThrow(root, id);

    const doc = await loadDoc(filePath) as Document;
    const content = newContent ?? (doc as any).content ?? '';
    // For a frontmatter-native plan, steps live in frontmatter and the body table is a
    // generated view — a body edit must NOT silently re-derive steps. Only a legacy
    // (body-backed) plan still parses its steps from the body table.
    const isLegacyPlan = doc.type === 'plan' && (doc as any)._stepsFromFrontmatter !== true;
    if (newTargetRelease !== undefined && doc.type !== 'design') {
        throw new Error(`target_release is only valid on a design doc; '${resolvedId}' is type '${doc.type}'`);
    }

    const updated: Document = {
        ...doc,
        ...(newStatus ? { status: newStatus as any } : {}),
        ...(newRequiresLoad !== undefined ? { requires_load: newRequiresLoad } : {}),
        ...(newTargetRelease !== undefined ? { target_release: newTargetRelease } : {}),
        version: doc.version + 1,
        updated: today(),
        content,
        ...(isLegacyPlan ? { steps: parseStepsTable(content) } : {}),
    } as Document;

    await saveDoc(updated, filePath);
    return { content: [{ type: 'text' as const, text: JSON.stringify({ id: resolvedId, filePath }) }] };
}
