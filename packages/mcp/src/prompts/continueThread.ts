import { handleContextResource } from '../resources/context';

export const promptDef = {
    name: 'continue-thread',
    description: 'Load full thread context (idea, design, active plan, refs) and return a next-action proposal prompt.',
    arguments: [
        { name: 'weaveId', description: 'Weave ID', required: true },
        { name: 'threadId', description: 'Thread ID', required: true },
    ],
};

export async function handle(root: string, args: Record<string, string | undefined>) {
    const weaveId = args['weaveId'];
    const threadId = args['threadId'];
    if (!weaveId || !threadId) throw new Error('weaveId and threadId are required');

    const ctx = await handleContextResource(root, `loom://context/thread/${weaveId}/${threadId}?mode=chat`);
    const contextText = ctx.contents[0].text;

    return {
        description: `Thread context for ${weaveId}/${threadId}`,
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
