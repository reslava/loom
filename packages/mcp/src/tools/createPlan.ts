import * as fs from 'fs-extra';
import { loadWeave, saveDoc, loadDoc } from '../../../fs/dist';
import { weavePlan } from '../../../app/dist/weavePlan';

export const toolDef = {
    name: 'loom_create_plan',
    description: 'Create a new plan document in a thread. Provide `goal` + `steps` to generate a structured body, or pass a full `content` body (its steps table is parsed into the frontmatter steps; `content` takes precedence over goal/steps). Use this tool to create Loom plan docs — do not edit weave files directly.',
    inputSchema: {
        type: 'object' as const,
        properties: {
            weaveId: { type: 'string', description: 'Target weave id' },
            threadId: { type: 'string', description: 'Thread id inside the weave' },
            title: { type: 'string', description: 'Optional plan title' },
            goal: { type: 'string', description: 'Optional goal description for the plan body' },
            steps: { type: 'array', items: { type: 'string' }, description: 'Ordered list of step descriptions. Each entry becomes a table row and a detailed section in the plan body.' },
            content: { type: 'string', description: 'Optional full markdown body (no frontmatter). When provided, replaces the generated body and the frontmatter steps are parsed from its steps table; takes precedence over goal/steps.' },
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
        steps: args['steps'] as string[] | undefined,
        content: args['content'] as string | undefined,
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
