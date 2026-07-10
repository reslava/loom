import * as path from 'path';
import * as fs from 'fs-extra';
import * as os from 'os';
import { assert, createPlanDoc } from './test-utils.ts';
import { loadWeave, saveDocs } from '../packages/fs/dist/index.js';
import { runEvent } from '../packages/app/dist/runEvent.js';
import { applyEvent } from '../packages/core/dist/index.js';

// ── A deliberately NON-CANONICAL sibling plan ───────────────────────────────
// Frontmatter keys are out of canonical order (title before type) and the body
// has no H1 + a trailing "### Notes" section. ANY re-serialisation of this doc
// would change its bytes (key reorder + H1 sync + steps-table rewrite). So if
// the file is byte-identical after an unrelated event, it proves the save path
// never touched it — the blast-radius guarantee.
const SIBLING = `---
title: Sibling Plan
type: plan
id: beta-plan-001
status: implementing
created: 2026-05-27
version: 1
tags: []
parent_id: null
child_ids: []
requires_load: []
---

## Goal
Sibling that must never be re-written by an event on another plan.

## Steps
| Done | # | Step | Files touched | Blocked by |
|---|---|---|---|---|
| 🔳 | 1 | only step | — | — |

### Notes
- this section must survive untouched
`;

async function run() {
    console.log('🔁 Running event-save-scope tests...\n');

    // ── 1. Pure: applyEvent reports only the doc the event changed ──────────
    console.log('  • applyEvent.changed contains only the mutated plan...');
    {
        const planA: any = {
            type: 'plan', id: 'es-planA', title: 'A', status: 'implementing',
            created: '2026-05-27', version: 1, tags: [], parent_id: null, child_ids: [], requires_load: [],
            content: '## Steps\n', steps: [
                { order: 1, description: 'a1', status: 'pending', files_touched: [], blockedBy: [] },
                { order: 2, description: 'a2', status: 'pending', files_touched: [], blockedBy: [] },
            ],
        };
        const planB: any = {
            type: 'plan', id: 'es-planB', title: 'B', status: 'implementing',
            created: '2026-05-27', version: 1, tags: [], parent_id: null, child_ids: [], requires_load: [],
            content: '## Steps\n\n### Notes\nkeep', steps: [
                { order: 1, description: 'b1', status: 'pending', files_touched: [], blockedBy: [] },
            ],
        };
        const thread: any = {
            id: 't', weaveSlug: 'w', idea: undefined, design: undefined,
            plans: [planA, planB], dones: [], chats: [], refDocs: [], allDocs: [planA, planB],
        };
        const weave: any = { id: 'w', threads: [thread], looseFibers: [], chats: [], refDocs: [], allDocs: [planA, planB] };

        const result = applyEvent(weave, { type: 'COMPLETE_STEP', planId: 'es-planA', stepIndex: 0 } as any);
        assert(Array.isArray(result.changed), 'applyEvent returns a changed array');
        assert(result.changed.length === 1, `expected 1 changed doc, got ${result.changed.length}`);
        assert(result.changed[0] === 'es-planA', 'only planA reported as changed');
        const outA = result.weave.allDocs.find((d: any) => d.id === 'es-planA') as any;
        assert(outA.steps[0].status === 'done', 'planA step 1 marked done in the returned weave');
        console.log('    ✅ changed = [es-planA]; sibling excluded');
    }

    // ── 2. IO: a COMPLETE_STEP on one plan leaves its sibling byte-identical ─
    console.log('  • runEvent persists only the changed plan; sibling file untouched...');
    const loomRoot = path.join(os.tmpdir(), `loom-event-save-scope-${Date.now()}`);
    const weavePath = path.join(loomRoot, 'loom', 'esw');
    try {
        // planA — the plan we will mutate (thread "alpha")
        const planAPath = await createPlanDoc(weavePath, 'alpha-plan-001', {
            status: 'implementing',
            steps: [
                { order: 1, description: 'First step', status: 'pending' },
                { order: 2, description: 'Second step', status: 'pending' },
            ],
        });

        // planB — the sibling we assert is never written (thread "beta")
        const planBPath = path.join(weavePath, 'beta', 'plans', 'beta-plan-001.md');
        await fs.outputFile(planBPath, SIBLING);
        const siblingBefore = await fs.readFile(planBPath, 'utf8');

        const loadWeaveOrThrow = async (root: string, id: string) => {
            const w = await loadWeave(root, id);
            if (!w) throw new Error(`Weave '${id}' not found`);
            return w;
        };

        await runEvent(
            'esw',
            { type: 'COMPLETE_STEP', planId: 'alpha-plan-001', stepIndex: 0 } as any,
            { loadWeave: loadWeaveOrThrow, saveDocs, loomRoot },
        );

        const planAAfter = await fs.readFile(planAPath, 'utf8');
        assert(/\|\s*✅\s*\|\s*1\s*\|/.test(planAAfter), 'planA step 1 is marked done on disk');

        const siblingAfter = await fs.readFile(planBPath, 'utf8');
        assert(siblingAfter === siblingBefore, 'sibling plan file is byte-identical (never re-serialised)');
        assert(siblingAfter.includes('### Notes'), 'sibling Notes section intact');
        console.log('    ✅ planA saved; beta-plan-001 untouched (byte-identical)');
    } finally {
        await fs.remove(loomRoot).catch(() => {});
    }

    console.log('\n✅ event-save-scope tests passed\n');
}

run().catch(e => { console.error('❌', e); process.exit(1); });
