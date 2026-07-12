import { getReportKind, reportKindSlugs } from '../../../core/dist';
import { handleRoadmapResource } from '../resources/roadmap';

export const promptDef = {
    name: 'report',
    description:
        'Assemble a filtered slice of the Loom doc graph for a report kind and return an instruction to synthesize the report, then persist it via loom_create_report. Slice 1: kind "project-overview", selection = roadmap passthrough.',
    arguments: [
        { name: 'kind', description: 'Report kind slug (e.g. "project-overview").', required: true },
        { name: 'weaveSlug', description: 'Optional weave slug filter (also the persist target + provenance).', required: false },
    ],
};

export async function handle(root: string, args: Record<string, string | undefined>) {
    const kindSlug = args['kind'];
    if (!kindSlug) throw new Error('kind is required');
    const kind = getReportKind(kindSlug);
    if (!kind) {
        throw new Error(`Unknown report kind "${kindSlug}". Known kinds: ${reportKindSlugs().join(', ')}.`);
    }

    const weaveSlug = args['weaveSlug'];
    const messages: Array<{ role: 'user' | 'assistant'; content: { type: 'text'; text: string } }> = [];

    // Slice 1: selection is a roadmap passthrough for every kind (project-overview).
    // Later slices route by kind.docTypes through the deterministic app/fs selection.
    let sliceText = '';
    try {
        const roadmap = await handleRoadmapResource(root, 'loom://roadmap');
        sliceText = roadmap.contents[0].text;
    } catch { /* selection is best-effort */ }

    if (sliceText) {
        messages.push({
            role: 'user',
            content: { type: 'text', text: `Source slice — the derived roadmap (loom://roadmap):\n\n\`\`\`json\n${sliceText}\n\`\`\`` },
        });
    }

    const persist = [
        'When the report is written, persist it by calling loom_create_report with:',
        `- kind="${kind.slug}"`,
        '- title="<a concise report title>"',
        '- content="<the full report markdown you wrote>"',
        weaveSlug ? `- weave_slug="${weaveSlug}"` : '- (omit weave_slug — this is a cross-weave/roadmap report)',
        '- sources=["loom://roadmap"]',
    ].join('\n');

    const instruction = [
        `# Generate a ${kind.title} report`,
        '',
        kind.promptFraming,
        '',
        persist,
    ].join('\n');

    messages.push({ role: 'user', content: { type: 'text', text: instruction } });

    return {
        description: `Generate a ${kind.title} report`,
        messages,
    };
}
