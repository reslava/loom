import { handleContextResource } from '../resources/context';

export const promptDef = {
    name: 'continue-thread',
    description: 'Load full thread context (idea, design, active plan, refs) and return a next-action proposal prompt.',
    arguments: [
        { name: 'weaveSlug', description: 'Weave folder slug', required: true },
        { name: 'threadSlug', description: 'Thread folder slug', required: true },
    ],
};

export async function handle(root: string, args: Record<string, string | undefined>) {
    const weaveSlug = args['weaveSlug'];
    const threadSlug = args['threadSlug'];
    if (!weaveSlug || !threadSlug) throw new Error('weaveSlug and threadSlug are required');

    const ctx = await handleContextResource(root, `loom://context/thread/${weaveSlug}/${threadSlug}?mode=chat`);
    const contextText = ctx.contents[0].text;

    return {
        description: `Thread context for ${weaveSlug}/${threadSlug}`,
        messages: [
            {
                role: 'user' as const,
                content: { type: 'text' as const, text: contextText },
            },
            {
                role: 'user' as const,
                content: {
                    type: 'text' as const,
                    text: 'Review this thread and propose the next action. Consider the current design, active plan, and any blocked or incomplete steps.',
                },
            },
        ],
    };
}
