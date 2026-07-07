export const promptDef = {
    name: 'weave-idea',
    description: 'Return a structured prompt for drafting a Loom idea document from a user description. The agent writes the body and passes it via `content` on loom_create_idea.',
    arguments: [
        { name: 'weaveSlug', description: 'Target weave folder slug', required: true },
        { name: 'threadSlug', description: 'Target thread folder slug (optional — omit to start a new thread)', required: false },
        { name: 'prompt', description: 'User description of the idea to draft', required: true },
    ],
};

export async function handle(_root: string, args: Record<string, string | undefined>) {
    const weaveSlug = args['weaveSlug'];
    const threadSlug = args['threadSlug'];
    const prompt = args['prompt'];
    if (!weaveSlug) throw new Error('weaveSlug is required');
    if (!prompt) throw new Error('prompt is required');

    const target = threadSlug ? `weave "${weaveSlug}", thread "${threadSlug}"` : `weave "${weaveSlug}"`;
    const createGuidance = threadSlug
        ? [
            `The target thread "${threadSlug}" already exists. Resolve its thread_ulid (the th_… handle — e.g. from loom://state), then call:`,
            `  loom_create_idea(weave_slug="${weaveSlug}", thread_ulid="<th_…>", title="<title>", content="<the markdown body you drafted>")`,
        ]
        : [
            `Mint the thread first, then create the idea in it (doc-create never fabricates a thread):`,
            `  loom_create_thread(weave_slug="${weaveSlug}", thread_slug="<kebab-slug>")  → returns { id: "<th_…>" }`,
            `  loom_create_idea(weave_slug="${weaveSlug}", thread_ulid="<th_…>", title="<title>", content="<the markdown body you drafted>")`,
        ];

    return {
        description: `Draft a Loom idea for ${target}`,
        messages: [
            {
                role: 'user' as const,
                content: {
                    type: 'text' as const,
                    text: [
                        `You are drafting a Loom idea document for ${target}.`,
                        '',
                        `User description: ${prompt}`,
                        '',
                        'A Loom idea document should:',
                        '- Start with a concise problem statement (what problem are we solving?)',
                        '- Explain the proposed concept at a high level',
                        '- List key questions or open considerations',
                        '- Be written in plain markdown, no frontmatter',
                        '',
                        ...createGuidance,
                        '',
                        'Pass the body via `content` in the create call so the doc is born at version 1 — do NOT follow with loom_update_doc.',
                    ].join('\n'),
                },
            },
        ],
    };
}
