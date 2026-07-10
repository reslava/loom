import * as path from 'path';
import * as fsExtra from 'fs-extra';
import { generateDocId, stripTrailingTypeWord, today as todayStamp } from '../../core/dist';

export interface CreateReferenceInput {
    title: string;
    description?: string;
    content?: string;
}

export interface CreateReferenceDeps {
    getActiveLoomRoot: () => string;
    fs: typeof fsExtra;
}

/**
 * Create a reference doc under `loom/refs/` as `{slug}-reference.md`. Shared by the
 * MCP tool and the CLI so both surfaces write byte-identical files (parity). A
 * trailing "reference" word in the title is stripped so "API Reference" → api-reference.md
 * (not api-reference-reference.md). Reference docs are born at status "active" — no
 * draft gate. Pass `content` to write the body; omit for a placeholder.
 */
export async function createReference(
    input: CreateReferenceInput,
    deps: CreateReferenceDeps
): Promise<{ id: string; filePath: string; slug: string }> {
    const loomRoot = deps.getActiveLoomRoot();
    const { title } = input;
    const description = input.description ?? '';
    const providedContent = input.content;

    const id = generateDocId('reference');
    const rawSlug = title.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '');
    const slug = stripTrailingTypeWord(rawSlug, 'reference');
    const refsDir = path.join(loomRoot, 'loom', 'refs');
    await deps.fs.ensureDir(refsDir);

    const today = todayStamp();
    const filePath = path.join(refsDir, `${slug}-reference.md`);

    const lines = [
        '---',
        'type: reference',
        `id: ${id}`,
        `title: "${title}"`,
        'status: active',
        `created: ${today}`,
        'version: 1',
        'tags: []',
        'parent_id: null',
        'child_ids: []',
        'requires_load: []',
        `slug: ${slug}`,
        ...(description ? [`description: "${description}"`] : []),
        '---',
        '',
    ];

    const body = providedContent
        ? (providedContent.endsWith('\n') ? providedContent : `${providedContent}\n`)
        : `# ${title}\n\n${description ? `${description}\n\n` : ''}<!-- Add reference content here -->\n`;
    await deps.fs.writeFile(filePath, lines.join('\n') + body, 'utf8');

    return { id, filePath, slug };
}
