import * as path from 'path';
import * as fs from 'fs-extra';
import { findDocumentById, loadDoc, saveDoc } from '../../../fs/dist';
import { createBaseFrontmatter } from '../../../core/dist';
import { DoneDoc } from '../../../core/dist/entities/done';
import { PlanDoc } from '../../../core/dist/entities/plan';

export const toolDef = {
    name: 'loom_append_done',
    description: 'Append an implementation note for a plan step to {thread}/done/{plan-id}-done.md. Creates the done doc with proper Loom frontmatter on first call. Idempotent on the same step number — replaces the existing section rather than duplicating.',
    inputSchema: {
        type: 'object' as const,
        properties: {
            planId: { type: 'string', description: 'Plan ID (e.g. "my-weave-plan-001")' },
            stepNumber: { type: 'number', description: 'Step number (1-based)' },
            notes: { type: 'string', description: 'Markdown notes describing what was implemented (files created/edited, decisions, etc.)' },
        },
        required: ['planId', 'stepNumber', 'notes'],
    },
};

interface Section {
    header: string;
    body: string[];
}

function parseSections(content: string): { preamble: string[]; sections: Section[] } {
    const lines = content.split('\n');
    const preamble: string[] = [];
    const sections: Section[] = [];
    let current: Section | null = null;

    for (const line of lines) {
        if (/^## Step \d+ — /.test(line)) {
            if (current) sections.push(current);
            current = { header: line, body: [] };
        } else if (current) {
            current.body.push(line);
        } else {
            preamble.push(line);
        }
    }
    if (current) sections.push(current);

    return { preamble, sections };
}

function rebuildContent(preamble: string[], sections: Section[]): string {
    const trimmedPreamble = preamble.join('\n').replace(/\n+$/, '');
    const sectionTexts = sections.map(s => {
        const trimmedBody = s.body.join('\n').replace(/^\n+|\n+$/g, '');
        return trimmedBody ? `${s.header}\n\n${trimmedBody}` : s.header;
    });
    return [trimmedPreamble, ...sectionTexts].filter(Boolean).join('\n\n') + '\n';
}

export async function handle(root: string, args: Record<string, unknown>) {
    const planId = args['planId'] as string;
    const stepNumber = args['stepNumber'] as number;
    const notes = args['notes'] as string;

    const planFilePath = await findDocumentById(root, planId);
    if (!planFilePath) throw new Error(`Plan not found: ${planId}`);

    const planDoc = await loadDoc(planFilePath) as PlanDoc;
    if (planDoc.type !== 'plan') throw new Error(`Document ${planId} is not a plan`);

    const step = (planDoc.steps ?? []).find(s => s.order === stepNumber);
    if (!step) throw new Error(`Step ${stepNumber} not found in plan ${planId}`);

    // Path layout: loom/{weaveId}/{threadId}/plans/{planId}.md → write to .../done/{planId}-done.md
    const plansDir = path.dirname(planFilePath);
    const threadDir = path.dirname(plansDir);
    const doneDir = path.join(threadDir, 'done');
    await fs.ensureDir(doneDir);

    const doneId = `${planId}-done`;
    const doneFilePath = path.join(doneDir, `${doneId}.md`);
    const exists = await fs.pathExists(doneFilePath);

    const newSection: Section = {
        header: `## Step ${stepNumber} — ${step.description}`,
        body: notes.split('\n'),
    };

    if (!exists) {
        const fm = createBaseFrontmatter('done', doneId, `Done — ${planDoc.title}`, planId);
        const content = rebuildContent([`# Done — ${planDoc.title}`], [newSection]);
        const doc = {
            ...fm,
            type: 'done' as const,
            status: 'final' as const,
            content,
        } as DoneDoc;
        await saveDoc(doc, doneFilePath);
        return {
            content: [{ type: 'text' as const, text: JSON.stringify({ filePath: doneFilePath, created: true }) }],
        };
    }

    const existingDoc = await loadDoc(doneFilePath) as DoneDoc;
    const { preamble, sections } = parseSections(existingDoc.content || '');

    const targetIdx = sections.findIndex(s => {
        const m = s.header.match(/^## Step (\d+) — /);
        return m !== null && parseInt(m[1], 10) === stepNumber;
    });

    if (targetIdx >= 0) {
        sections[targetIdx] = newSection;
    } else {
        let insertIdx = sections.findIndex(s => {
            const m = s.header.match(/^## Step (\d+) — /);
            return m !== null && parseInt(m[1], 10) > stepNumber;
        });
        if (insertIdx === -1) insertIdx = sections.length;
        sections.splice(insertIdx, 0, newSection);
    }

    const updatedDoc: DoneDoc = {
        ...existingDoc,
        content: rebuildContent(preamble, sections),
        version: existingDoc.version + 1,
    };
    await saveDoc(updatedDoc, doneFilePath);

    return {
        content: [{ type: 'text' as const, text: JSON.stringify({ filePath: doneFilePath, created: false }) }],
    };
}
