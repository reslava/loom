import * as fs from 'fs-extra';
import { getActiveLoomRoot, saveDoc, loadDoc, loadWeave } from '../../../fs/dist';
import { createWeave } from '../../../app/dist/weave';
import { createThread } from '../../../app/dist/thread';
import { createIdea } from '../../../app/dist/createIdea';
import { createPlan } from '../../../app/dist/createPlan';

// Composes the existing app create use-cases (mcp → app) to seed one tiny,
// obviously-a-demo weave→thread→idea→plan so a brand-new workspace shows the
// shape instead of an empty tree. Opt-in only (the extension's "Start with an
// example" button), never run on install (EX3).

const IDEA_BODY = `## What

A tiny worked example so you can see Loom's shape end to end: a **weave** (project
area) → **thread** (workstream) → **idea** → **plan** with steps.

Delete this whole \`example\` weave whenever you like — it exists only to show the loop.

## Why it matters

New workspaces start empty, which reads as "nothing works". Seeing a real graph —
idea, then a plan with concrete steps — makes the workflow obvious in ten seconds.

## Success

You can open each doc, run *Generate Design* / *Generate Plan* / *Do Step* on your
own threads, and understand what each produces.`;

export const toolDef = {
    name: 'loom_seed_example',
    description:
        "Seed one tiny, clearly-labelled example weave→thread→idea→plan into the workspace at LOOM_ROOT, so a brand-new Loom workspace shows the shape (idea → plan → steps) instead of an empty tree. Opt-in only — the VS Code extension's empty-state 'Start with an example' button calls this; it is NEVER run automatically on install. Creates a weave named 'example' the user can delete at any time. Returns the created ids.",
    inputSchema: {
        type: 'object' as const,
        properties: {},
        required: [],
    },
};

export async function handle(root: string, _args: Record<string, unknown>) {
    const weaveSlug = 'example';

    await createWeave({ weaveSlug }, { getActiveLoomRoot: () => root, fs });

    const thread: any = await createThread(
        { weaveSlug, threadSlug: 'first-feature', title: 'First Feature' },
        { getActiveLoomRoot: () => getActiveLoomRoot(root), saveDoc, fs },
    );
    const threadUlid: string = thread.id;

    const idea: any = await createIdea(
        { weaveSlug, threadUlid, title: 'Example: how a Loom thread fits together', content: IDEA_BODY },
        { getActiveLoomRoot: () => getActiveLoomRoot(root), saveDoc, loadDoc, fs },
    );

    const plan: any = await createPlan(
        {
            weaveSlug,
            threadUlid,
            title: 'Build the example feature',
            goal: 'A throwaway two-step plan so you can see how steps, files, and done-notes work. Run *Start Plan* then *Do Step* on it, or just delete the example weave.',
            steps: [
                { description: 'Read the idea and the design (if generated), then note the intended behaviour.', title: 'Understand the idea' },
                { description: 'Implement the feature and record what changed in the done note.', title: 'Implement', blockedBy: [] },
            ],
        },
        { loadWeave, saveDoc, loadDoc, fs, loomRoot: root },
    );

    return {
        content: [{
            type: 'text' as const,
            text: JSON.stringify({ weaveSlug, threadUlid, ideaId: idea.id, planId: plan.id }),
        }],
    };
}
