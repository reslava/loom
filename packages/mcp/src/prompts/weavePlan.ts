import { handleContextResource } from '../resources/context';

export const promptDef = {
    name: 'weave-plan',
    description: 'Load thread context and return a prompt for drafting a Loom implementation plan. The agent calls loom_create_plan with the generated steps array.',
    arguments: [
        { name: 'weaveId', description: 'Weave ID', required: true },
        { name: 'threadId', description: 'Thread ID', required: true },
    ],
};

export async function handle(root: string, args: Record<string, string | undefined>) {
    const weaveId = args['weaveId'];
    const threadId = args['threadId'];
    if (!weaveId || !threadId) throw new Error('weaveId and threadId are required');

    const ctx = await handleContextResource(root, `loom://context/thread/${weaveId}/${threadId}?mode=plan`);
    const contextText = ctx.contents[0].text;

    return {
        description: `Draft an implementation plan for ${weaveId}/${threadId}`,
        messages: [
            { role: 'user' as const, content: { type: 'text' as const, text: contextText } },
            {
                role: 'user' as const,
                content: {
                    type: 'text' as const,
                    text: [
                        'Based on the thread context above, draft a Loom implementation plan.',
                        '',
                        'Generate a JSON array of steps — output ONLY the JSON, no prose:',
                        '[{"order":1,"description":"..."},{"order":2,"description":"..."}]',
                        '',
                        'Steps should be:',
                        '- Atomic and independently verifiable',
                        '- Ordered by dependency',
                        '- Specific enough that a developer knows exactly what to do',
                        '',
                        `After generating, call loom_create_plan with weaveId="${weaveId}" threadId="${threadId}", a suitable title, and the steps array.`,
                    ].join('\n'),
                },
            },
        ],
    };
}
