import { resolveDocIdOrThrow, loadDoc, saveDoc } from '../../../fs/dist';
import { Document } from '../../../core/dist';

export const toolDef = {
    name: 'loom_patch_doc',
    description: 'Surgically edit a document\'s BODY by exact string match (old_string → new_string), like an editor\'s find-and-replace. Prefer this over loom_update_doc for one-line/section edits — no need to re-supply the whole body. Frontmatter is never matched or touched. For plans, the generated ## Steps table is off-limits (use loom_update_step / loom_reorder_steps); the rest of a plan body (Goal, ### Step N detail prose) is patchable. old_string must match exactly once unless replace_all is set. Use this tool to edit Loom doc prose — do not edit files directly.',
    inputSchema: {
        type: 'object' as const,
        properties: {
            id: { type: 'string', description: 'Document id to patch' },
            old_string: { type: 'string', description: 'Exact text to find in the body (must be unique unless replace_all).' },
            new_string: { type: 'string', description: 'Replacement text.' },
            replace_all: { type: 'boolean', description: 'Replace every occurrence instead of requiring a unique match. Default false.' },
        },
        required: ['id', 'old_string', 'new_string'],
    },
};

// The generated steps section: "## Steps" (or "# Steps") heading up to the next --- rule
// or heading. Mirrors parseStepsTable's boundary so we reject patches that land in the
// table Loom owns, while leaving the surrounding authored prose patchable.
const STEPS_SECTION_RE = /(?:^|\n)#{1,2} Steps\s*\n[\s\S]*?(?=\n---|\n#{1,6}\s|$)/i;

export async function handle(root: string, args: Record<string, unknown>) {
    const id = args['id'] as string;
    const oldString = args['old_string'] as string;
    const newString = args['new_string'] as string;
    const replaceAll = args['replace_all'] === true;

    if (typeof oldString !== 'string' || oldString.length === 0) {
        throw new Error('old_string must be a non-empty string');
    }
    if (oldString === newString) {
        throw new Error('old_string and new_string are identical — nothing to patch');
    }

    const { id: resolvedId, filePath } = await resolveDocIdOrThrow(root, id);
    const doc = await loadDoc(filePath) as Document;
    const body: string = (doc as any).content ?? '';

    // Count occurrences in the BODY only (frontmatter is parsed away by loadDoc, so it
    // can never be matched or altered here).
    const occurrences = body.split(oldString).length - 1;
    if (occurrences === 0) {
        throw new Error(`old_string not found in the body of '${resolvedId}'. Provide text that appears verbatim in the doc body.`);
    }
    if (occurrences > 1 && !replaceAll) {
        throw new Error(`old_string matches ${occurrences} times in '${resolvedId}' — add surrounding context to make it unique, or set replace_all: true.`);
    }

    // Plan guard: refuse any match that overlaps the generated ## Steps table.
    if (doc.type === 'plan') {
        const m = body.match(STEPS_SECTION_RE);
        if (m && m.index !== undefined) {
            const sectionStart = m.index;
            const sectionEnd = sectionStart + m[0].length;
            for (let idx = body.indexOf(oldString); idx !== -1; idx = body.indexOf(oldString, idx + 1)) {
                const matchEnd = idx + oldString.length;
                if (idx < sectionEnd && matchEnd > sectionStart) {
                    throw new Error('Refusing to patch the generated ## Steps table — edit steps via loom_update_step / loom_reorder_steps. The rest of the plan body (Goal, ### Step N detail) is patchable.');
                }
            }
        }
    }

    const newBody = replaceAll ? body.split(oldString).join(newString) : body.replace(oldString, newString);

    const updated: Document = {
        ...doc,
        version: doc.version + 1,
        updated: new Date().toISOString().split('T')[0],
        content: newBody,
    } as Document;

    await saveDoc(updated, filePath);
    return {
        content: [{ type: 'text' as const, text: JSON.stringify({ id: resolvedId, filePath, replacements: replaceAll ? occurrences : 1 }) }],
    };
}
