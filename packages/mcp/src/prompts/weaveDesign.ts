import { handleContextResource } from '../resources/context';

export const promptDef = {
    name: 'weave-design',
    description: 'Load thread context and return a prompt for drafting a Loom design document. The agent calls loom_create_design then loom_update_doc.',
    arguments: [
        { name: 'weaveId', description: 'Weave ID', required: true },
        { name: 'threadId', description: 'Thread ID', required: true },
    ],
};

export async function handle(root: string, args: Record<string, string | undefined>) {
    const weaveId = args['weaveId'];
    const threadId = args['threadId'];
    if (!weaveId || !threadId) throw new Error('weaveId and threadId are required');

    const ctx = await handleContextResource(root, `loom://context/thread/${weaveId}/${threadId}?mode=design`);
    const contextText = ctx.contents[0].text;

    return {
        description: `Draft a design for ${weaveId}/${threadId}`,
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
                        `After drafting, call loom_create_design with weaveId="${weaveId}" threadId="${threadId}" and a suitable title.`,
                        'Then call loom_update_doc to set the generated body.',
                    ].join('\n'),
                },
            },
        ],
    };
}
