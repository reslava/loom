import * as fs from 'fs-extra';
import { loadWeave, saveDoc, saveDocs, loadDoc } from '../../../fs/dist';
import { quickShip } from '../../../app/dist/quickShip';

export const toolDef = {
    name: 'loom_quick_ship',
    description:
        'Record already-done work as exactly one new DONE plan in a single call — the one-action way to leave a versioned-history entry for a fast fix/feature (roadmap history + actual_release key on done plans). Composes create-plan → start → complete-each-step → close-with-done-record. It does NOT implement code (do the work first, then quick-ship) and NEVER touches an existing plan — it always mints one fresh done plan. Target either an existing thread (thread_ulid) or mint a new one (newThread); pass exactly one. `description` is one line, or a short list where each entry becomes one done step — each must read as completed work. Pass `title` to give the plan a descriptive label for roadmap history (falls back to a generic `{thread} Plan` when omitted).',
    inputSchema: {
        type: 'object' as const,
        properties: {
            weave_slug: { type: 'string', description: 'Target weave folder slug.' },
            thread_ulid: {
                type: 'string',
                description: 'Stable th_ ULID of an existing thread to record into. Pass exactly one of thread_ulid or newThread.',
            },
            newThread: {
                type: 'object',
                description: 'Mint a new thread to hold the done plan. Pass exactly one of thread_ulid or newThread.',
                properties: {
                    slug: { type: 'string', description: 'New thread folder slug (kebab-case).' },
                    title: { type: 'string', description: 'Optional human title for the new thread.' },
                },
                required: ['slug'],
            },
            description: {
                oneOf: [{ type: 'string' }, { type: 'array', items: { type: 'string' } }],
                description:
                    'The completed work: one line (string), or a short list (array) where each entry becomes one DONE step. Each must read as completed work.',
            },
            title: {
                type: 'string',
                description:
                    'Optional descriptive plan title for roadmap history. Falls back to a generic `{thread} Plan` when omitted.',
            },
            notes: {
                type: 'string',
                description: 'Optional done-doc notes; defaults to a record derived from the description(s).',
            },
        },
        required: ['weave_slug', 'description'],
    },
};

export async function handle(root: string, args: Record<string, unknown>) {
    // completeStep / closePlan flatMap over weave.threads, so a null weave must fail loud.
    const loadWeaveStrict = async (r: string, w: string) => {
        const result = await loadWeave(r, w);
        if (!result) throw new Error(`Weave not found: ${w}`);
        return result;
    };

    const result = await quickShip(
        {
            weaveSlug: args['weave_slug'] as string,
            threadUlid: args['thread_ulid'] as string | undefined,
            newThread: args['newThread'] as { slug: string; title?: string } | undefined,
            description: args['description'] as string | string[],
            title: args['title'] as string | undefined,
            notes: args['notes'] as string | undefined,
        },
        { loadWeave: loadWeaveStrict, saveDoc, saveDocs, loadDoc, fs, loomRoot: root },
    );

    return { content: [{ type: 'text' as const, text: JSON.stringify(result) }] };
}
