import * as fs from 'fs-extra';
import { loadWeave, saveDoc, loadDoc } from '../../../fs/dist';
import { weavePlan } from '../../../app/dist/weavePlan';

export const toolDef = {
    name: 'loom_create_plan',
    description: 'Create a new plan document in a thread. **Write the plan in this same call** by passing `goal` (prose) + a structured `steps` array — each step is an object, never a hand-formatted Markdown table. Loom owns the steps table and the canonical `## Steps` columns; you supply the data and the plan is born frontmatter-native (the steps live in YAML frontmatter, the table is a generated view). Do NOT create a stub and immediately follow with loom_update_doc. Use this tool to create Loom plan docs — do not edit weave files directly.',
    inputSchema: {
        type: 'object' as const,
        properties: {
            weaveId: { type: 'string', description: 'Target weave id' },
            threadId: { type: 'string', description: 'Thread id inside the weave' },
            title: { type: 'string', description: 'Optional plan title' },
            goal: { type: 'string', description: 'One paragraph: what this plan implements and why. Rendered as the body ## Goal section.' },
            steps: {
                type: 'array',
                description: 'Ordered structured steps. Each is an object — Loom renders the canonical table and per-step sections from these. Do NOT pass a Markdown table.',
                items: {
                    type: 'object',
                    properties: {
                        description: { type: 'string', description: 'The step, as it appears in the table "Step" cell.' },
                        title: { type: 'string', description: 'Optional short heading for the "### Step N — {title}" section (defaults to description).' },
                        files: { type: 'array', items: { type: 'string' }, description: 'Files this step touches ("Files touched" column).' },
                        blockedBy: { type: 'array', items: { type: 'string' }, description: 'Step ids and/or plan ids this step depends on.' },
                        satisfies: { type: 'array', items: { type: 'string' }, description: 'Requirement handles (IN/C) this step advances.' },
                        detail: { type: 'string', description: 'Optional markdown for the "### Step N" detail section (body prose, not persisted to frontmatter).' },
                    },
                    required: ['description'],
                },
            },
            parentId: { type: 'string', description: 'Optional explicit parent doc id (defaults to thread design if present)' },
        },
        required: ['weaveId', 'threadId'],
    },
};

export async function handle(root: string, args: Record<string, unknown>) {
    const input = {
        weaveId: args['weaveId'] as string,
        threadId: args['threadId'] as string,
        title: args['title'] as string | undefined,
        goal: args['goal'] as string | undefined,
        steps: args['steps'] as any[] | undefined,
        parentId: args['parentId'] as string | undefined,
    };
    const result = await weavePlan(input, {
        loadWeave,
        saveDoc,
        loadDoc,
        fs,
        loomRoot: root,
    });
    return { content: [{ type: 'text' as const, text: JSON.stringify(result) }] };
}
