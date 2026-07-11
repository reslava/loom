import { handleContextResource } from '../resources/context';

export const promptDef = {
    name: 'generate-plan',
    description: 'Load thread context and return a prompt for drafting a Loom implementation plan. The agent calls loom_create_plan with goal + a structured steps array.',
    arguments: [
        { name: 'weaveSlug', description: 'Weave folder slug', required: true },
        { name: 'threadSlug', description: 'Thread folder slug', required: true },
    ],
};

export async function handle(root: string, args: Record<string, string | undefined>) {
    const weaveSlug = args['weaveSlug'];
    const threadSlug = args['threadSlug'];
    if (!weaveSlug || !threadSlug) throw new Error('weaveSlug and threadSlug are required');

    const ctx = await handleContextResource(root, `loom://context/thread/${weaveSlug}/${threadSlug}?mode=plan`);
    const contextText = ctx.contents[0].text;

    return {
        description: `Draft an implementation plan for ${weaveSlug}/${threadSlug}`,
        messages: [
            { role: 'user' as const, content: { type: 'text' as const, text: contextText } },
            {
                role: 'user' as const,
                content: {
                    type: 'text' as const,
                    text: [
                        'Based on the thread context above, draft a Loom implementation plan.',
                        '',
                        "SCOPE — the thread's locked requirements (the `req` doc) appear FIRST in the context above:",
                        '- Treat its ❌ Excluded items and ⛓ Constraints as HARD BOUNDARIES — never add a step for excluded work.',
                        '- Every ✅ Included requirement must be advanced by at least one step.',
                        '- For each step, cite the requirement ids it advances (the `IN`/`C` handles). Never cite an Excluded id.',
                        '',
                        'Steps should be atomic and independently verifiable, ordered by dependency, and specific.',
                        '',
                        `Call loom_create_plan(weave_slug="${weaveSlug}", thread_ulid="<th_…>", title="<title>", goal="<one paragraph>", steps=[…]). Take the thread_ulid from the context-bundle manifest above.`,
                        '`steps` is a STRUCTURED ARRAY of objects — NEVER a Markdown table (Loom renders the Steps table itself). Each step is an object:',
                        '  { description, title?, files?: ["path"], blockedBy?: ["1"], satisfies?: ["IN1","C1"] }',
                        'blockedBy references a sibling step by its 1-based ordinal ("1" = the first step); satisfies lists the requirement ids the step advances.',
                    ].join('\n'),
                },
            },
        ],
    };
}
