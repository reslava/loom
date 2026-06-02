import * as path from 'path';
import * as fsExtra from 'fs-extra';
import { generateDocId } from '../../../core/dist';

export const toolDef = {
    name: 'loom_create_reference',
    description: 'Create a new reference document in loom/refs/. Named {slug}-reference.md. Pass `content` to write the body in the same call; omit it for a placeholder. Reference docs are born at status "active" (no draft gate). Returns the doc id, file path, and slug.',
    inputSchema: {
        type: 'object' as const,
        properties: {
            title: { type: 'string', description: 'Human-readable reference title' },
            description: { type: 'string', description: 'Short description of what this reference covers (stored in frontmatter)' },
            content: { type: 'string', description: 'Optional markdown body (no frontmatter). When provided, replaces the placeholder body.' },
        },
        required: ['title'],
    },
};

export async function handle(root: string, args: Record<string, unknown>) {
    const title = args['title'] as string;
    const description = (args['description'] as string | undefined) ?? '';
    const providedContent = args['content'] as string | undefined;

    const id = generateDocId('reference');
    const slug = title.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '');
    const refsDir = path.join(root, 'loom', 'refs');
    await fsExtra.ensureDir(refsDir);

    const today = new Date().toISOString().split('T')[0];
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
    await fsExtra.writeFile(filePath, lines.join('\n') + body, 'utf8');

    return { content: [{ type: 'text' as const, text: JSON.stringify({ id, filePath, slug }) }] };
}
