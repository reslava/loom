import * as fs from 'fs-extra';
import { loadWeave, saveDoc, saveDocs, loadDoc } from '../../../fs/dist';
import { quickShip } from '../../../app/dist/quickShip';

export const toolDef = {
    name: 'loom_quick_ship',
    description:
        'Record already-done work as exactly one new DONE plan in a single call — the one-action way to leave a versioned-history entry for a fast fix/feature (roadmap history + actual_release key on done plans). Composes create-plan → start → complete-each-step → close-with-done-record. It does NOT implement code (do the work first, then quick-ship) and NEVER touches an existing plan — it always mints one fresh done plan. Target either an existing thread (threadId) or mint a new one (newThread); pass exactly one. `description` is one line, or a short list where each entry becomes one done step — each must read as completed work.',
    inputSchema: {
        type: 'object' as const,
        properties: {
            weaveId: { type: 'string', description: 'Target weave id.' },
            threadId: {
                type: 'string',
                description: 'Existing thread id to record into. Pass exactly one of threadId or newThread.',
            },
            newThread: {
                type: 'object',
                description: 'Mint a new thread to hold the done plan. Pass exactly one of threadId or newThread.',
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
            notes: {
                type: 'string',
                description: 'Optional done-doc notes; defaults to a record derived from the description(s).',
            },
        },
        required: ['weaveId', 'description'],
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
            weaveId: args['weaveId'] as string,
            threadId: args['threadId'] as string | undefined,
            newThread: args['newThread'] as { slug: string; title?: string } | undefined,
            description: args['description'] as string | string[],
            notes: args['notes'] as string | undefined,
        },
        { loadWeave: loadWeaveStrict, saveDoc, saveDocs, loadDoc, fs, loomRoot: root },
    );

    return { content: [{ type: 'text' as const, text: JSON.stringify(result) }] };
}
