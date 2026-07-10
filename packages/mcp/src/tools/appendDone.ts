import * as path from 'path';
import * as fs from 'fs-extra';
import { resolveDocIdOrThrow, loadDoc, saveDoc } from '../../../fs/dist';
import { createBaseFrontmatter, doneFileName, planOrdinalFromFile } from '../../../core/dist';
import { DoneDoc } from '../../../core/dist/entities/done';
import { PlanDoc } from '../../../core/dist/entities/plan';
import { requirePlanUlid } from './planUlid';

export const toolDef = {
    name: 'loom_append_done',
    description: 'Record implementation notes in {thread}/done/{plan-id}-done.md. Two shapes: pass a single { stepNumber, notes } to record one step (incremental, during a DoStep loop), OR pass a `steps` array [{ stepNumber, notes }, …] to author the WHOLE done doc (all steps) in a single call. Either way each step becomes a "## Step N — …" section; calls are idempotent on step number — re-recording a step replaces its section rather than duplicating. Creates the done doc with proper Loom frontmatter on first call. This is the home for done-doc authoring; loom_close_plan only finalizes the plan.',
    inputSchema: {
        type: 'object' as const,
        properties: {
            plan_ulid: { type: 'string', description: 'Plan\'s stable pl_ ULID (e.g. "pl_01J…"). ULID only — a filename stem or title is rejected.' },
            stepNumber: { type: 'number', description: 'Single-step form: step number (1-based). Omit when using `steps`.' },
            notes: { type: 'string', description: 'Single-step form: markdown notes for that step (files created/edited, decisions, etc.). Omit when using `steps`.' },
            steps: {
                type: 'array',
                description: 'Batch form: record/replace multiple step sections in one call (use this to write the whole done doc at once).',
                items: {
                    type: 'object',
                    properties: {
                        stepNumber: { type: 'number', description: 'Step number (1-based)' },
                        notes: { type: 'string', description: 'Markdown notes for this step' },
                    },
                    required: ['stepNumber', 'notes'],
                },
            },
        },
        required: ['plan_ulid'],
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

/** Upsert a step section by step number, keeping sections ordered by step number. */
function upsertSection(sections: Section[], stepNumber: number, newSection: Section): void {
    const targetIdx = sections.findIndex(s => {
        const m = s.header.match(/^## Step (\d+) — /);
        return m !== null && parseInt(m[1], 10) === stepNumber;
    });
    if (targetIdx >= 0) {
        sections[targetIdx] = newSection;
        return;
    }
    let insertIdx = sections.findIndex(s => {
        const m = s.header.match(/^## Step (\d+) — /);
        return m !== null && parseInt(m[1], 10) > stepNumber;
    });
    if (insertIdx === -1) insertIdx = sections.length;
    sections.splice(insertIdx, 0, newSection);
}

export async function handle(root: string, args: Record<string, unknown>) {
    const planId = requirePlanUlid(args);

    // Normalize single | batch input into one ordered list of entries.
    const rawSteps = args['steps'];
    const isBatch = Array.isArray(rawSteps) && rawSteps.length > 0;
    const entries: Array<{ stepNumber: number; notes: string }> = isBatch
        ? (rawSteps as any[]).map(s => ({ stepNumber: s?.stepNumber, notes: s?.notes }))
        : [{ stepNumber: args['stepNumber'] as number, notes: args['notes'] as string }];

    for (const e of entries) {
        if (typeof e.stepNumber !== 'number' || typeof e.notes !== 'string') {
            throw new Error('loom_append_done requires either a single { stepNumber, notes } or a non-empty `steps` array of { stepNumber, notes }.');
        }
    }

    // Primary (agent-supplied) id → suggest-on-miss.
    const { filePath: planFilePath } = await resolveDocIdOrThrow(root, planId);

    const planDoc = await loadDoc(planFilePath) as PlanDoc;
    if (planDoc.type !== 'plan') throw new Error(`Document ${planId} is not a plan`);

    // Validate every referenced step exists before writing anything (atomic / fail-loud).
    const planSteps = planDoc.steps ?? [];
    const resolved = entries.map(e => {
        const step = planSteps.find(s => s.order === e.stepNumber);
        if (!step) throw new Error(`Step ${e.stepNumber} not found in plan ${planId}`);
        return { stepNumber: e.stepNumber, description: step.description, notes: e.notes };
    });

    // Path layout: loom/{weaveSlug}/{threadSlug}/plans/{planId}.md → write to .../done/{planId}-done.md
    const plansDir = path.dirname(planFilePath);
    const threadDir = path.dirname(plansDir);
    const doneDir = path.join(threadDir, 'done');
    await fs.ensureDir(doneDir);

    // Done id stays ULID-derived (stable); the FILENAME humanises to plan-NNN-done.md,
    // mirroring the plan's ordinal. Dual-read: keep using a legacy {planId}-done.md if
    // one already exists, so pre-migration repos append to the same file.
    const doneId = `${planId}-done`;
    const planOrd = planOrdinalFromFile(path.basename(planFilePath));
    const canonicalDoneFile = planOrd !== null ? doneFileName(planOrd) : `${doneId}.md`;
    const legacyDoneFile = `${doneId}.md`;
    let doneBasename = canonicalDoneFile;
    if (canonicalDoneFile !== legacyDoneFile
        && !(await fs.pathExists(path.join(doneDir, canonicalDoneFile)))
        && (await fs.pathExists(path.join(doneDir, legacyDoneFile)))) {
        doneBasename = legacyDoneFile;
    }
    const doneFilePath = path.join(doneDir, doneBasename);
    const exists = await fs.pathExists(doneFilePath);

    let preamble: string[] = [];
    let sections: Section[] = [];
    let existingDoc: DoneDoc | null = null;
    if (exists) {
        existingDoc = await loadDoc(doneFilePath) as DoneDoc;
        const parsed = parseSections(existingDoc.content || '');
        preamble = parsed.preamble;
        sections = parsed.sections;
    }

    for (const r of resolved) {
        upsertSection(sections, r.stepNumber, {
            header: `## Step ${r.stepNumber} — ${r.description}`,
            body: r.notes.split('\n'),
        });
    }

    const stepNumbers = resolved.map(r => r.stepNumber);

    if (!exists) {
        const fm = createBaseFrontmatter('done', doneId, `Done — ${planDoc.title}`, planId);
        const content = '\n' + rebuildContent(preamble, sections);
        const doc = { ...fm, type: 'done' as const, status: 'done' as const, content } as DoneDoc;
        await saveDoc(doc, doneFilePath);
        return {
            content: [{ type: 'text' as const, text: JSON.stringify({ planId, doneId, stepNumbers, filePath: doneFilePath, created: true }) }],
        };
    }

    const updatedDoc: DoneDoc = {
        ...(existingDoc as DoneDoc),
        content: rebuildContent(preamble, sections),
        version: (existingDoc as DoneDoc).version + 1,
    };
    await saveDoc(updatedDoc, doneFilePath);

    return {
        content: [{ type: 'text' as const, text: JSON.stringify({ planId, doneId, stepNumbers, filePath: doneFilePath, created: false }) }],
    };
}
