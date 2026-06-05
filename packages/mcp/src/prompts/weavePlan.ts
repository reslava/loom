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
                        'SCOPE — the thread\'s locked requirements (the `req` doc) appear FIRST in the context above:',
                        '- Treat its ❌ Excluded items and ⛓ Constraints as HARD BOUNDARIES — never add a step for excluded work.',
                        '- Every ✅ Included requirement must be advanced by at least one step.',
                        '- For each step, cite the requirement ids it advances (the `IN`/`C` handles). Never cite an Excluded id.',
                        '',
                        'Steps should be atomic and independently verifiable, ordered by dependency, and specific.',
                        '',
                        `Call loom_create_plan with weaveId="${weaveId}" threadId="${threadId}", a suitable title, and a \`content\` markdown body whose Steps table has a Satisfies column listing the cited ids per step (comma-separated, — when none) so coverage is traceable. Example row:`,
                        '| 🔳 | 1 | Build the registration form | src/auth.ts | — | IN1, C1 |',
                    ].join('\n'),
                },
            },
        ],
    };
}
