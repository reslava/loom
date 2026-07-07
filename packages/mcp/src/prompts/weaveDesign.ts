import { handleContextResource } from '../resources/context';

export const promptDef = {
    name: 'weave-design',
    description: 'Load thread context and return a prompt for drafting a Loom design document. The agent passes the body via `content` on loom_create_design.',
    arguments: [
        { name: 'weaveSlug', description: 'Weave folder slug', required: true },
        { name: 'threadSlug', description: 'Thread folder slug', required: true },
    ],
};

export async function handle(root: string, args: Record<string, string | undefined>) {
    const weaveSlug = args['weaveSlug'];
    const threadSlug = args['threadSlug'];
    if (!weaveSlug || !threadSlug) throw new Error('weaveSlug and threadSlug are required');

    const ctx = await handleContextResource(root, `loom://context/thread/${weaveSlug}/${threadSlug}?mode=design`);
    const contextText = ctx.contents[0].text;

    return {
        description: `Draft a design for ${weaveSlug}/${threadSlug}`,
        messages: [
            { role: 'user' as const, content: { type: 'text' as const, text: contextText } },
            {
                role: 'user' as const,
                content: {
                    type: 'text' as const,
                    text: [
                        'Based on the thread context above, draft a Loom design document.',
                        '',
                        'A Loom design document should:',
                        '- Define the architecture or approach clearly',
                        '- Include component structure, interfaces, and data flow',
                        '- List key design decisions with rationale',
                        '- Identify open questions and trade-offs',
                        '- Be written in plain markdown, no frontmatter',
                        '',
                        `Then call loom_create_design(weave_slug="${weaveSlug}", thread_ulid="<th_…>", content="<the markdown body>"). Take the thread_ulid from the context-bundle manifest above (the \`thread_ulid=\` field). Pass the body via \`content\` — do not follow with loom_update_doc.`,
                    ].join('\n'),
                },
            },
        ],
    };
}
