import * as path from 'path';
import * as fs from 'fs-extra';
import * as fsNative from 'fs';
import * as os from 'os';
import { assert, createPlanDoc } from './test-utils.ts';
import { loadWeave, saveDoc, loadDoc } from '../packages/fs/dist/index.js';
import { closePlan } from '../packages/app/dist/closePlan.js';

const TMP = path.join(os.tmpdir(), 'loom-close-plan-tests');

async function makeLoomRoot(): Promise<string> {
    const loomRoot = TMP;
    await fs.remove(loomRoot);
    await fs.ensureDir(path.join(loomRoot, '.loom'));
    await fs.outputFile(path.join(loomRoot, '.loom', 'workflow.yml'), 'version: 1\n');
    return loomRoot;
}

function makeDeps(loomRoot: string) {
    const loadWeaveOrThrow = async (root: string, id: string) => {
        const w = await loadWeave(root, id);
        if (!w) throw new Error(`Weave '${id}' is empty`);
        return w;
    };
    return {
        loadWeave: loadWeaveOrThrow,
        saveDoc,
        fs,
        loomRoot,
    };
}

/** Seed a pre-existing done doc, as loom_append_done would after per-step records. */
async function seedDoneDoc(weavePath: string, planId: string, body: string) {
    const threadId = planId.split('-plan-')[0];
    const doneDir = path.join(weavePath, threadId, 'done');
    await fs.ensureDir(doneDir);
    const donePath = path.join(doneDir, `${planId}-done.md`);
    await saveDoc(
        {
            type: 'done',
            id: `${planId}-done`,
            title: `Done — ${planId}`,
            status: 'done',
            created: '2026-06-26',
            version: 1,
            tags: [],
            parent_id: planId,
            requires_load: [],
            content: `\n${body}\n`,
        } as any,
        donePath
    );
    return donePath;
}

async function testClosePlan() {
    console.log('📦 Running closePlan use-case tests...\n');

    // ── test 1: notes written verbatim as the done doc body ──────────────────
    console.log('  • closePlan: notes written verbatim, plan finalized in place...');
    {
        const loomRoot = await makeLoomRoot();
        const weaveId = 'cp-weave';
        const weavePath = path.join(loomRoot, 'loom', weaveId);
        const planId = `${weaveId}-plan-001`;

        await createPlanDoc(weavePath, planId, { status: 'implementing' });

        const NOTES = 'Implemented X by editing foo.ts and bar.ts. Skipped step 3 (out of scope).';
        const result = await closePlan({ planId, notes: NOTES }, makeDeps(loomRoot));

        const threadId = planId.split('-plan-')[0];
        const threadPath = path.join(weavePath, threadId);
        const donePath = path.join(threadPath, 'done', `${planId}-done.md`);
        assert(await fs.pathExists(donePath), `done doc must exist at ${donePath}`);
        const doneContent = fsNative.readFileSync(donePath, 'utf8');
        assert(doneContent.includes('type: done'), 'done doc must have type: done');
        assert(doneContent.includes('status: done'), 'done doc must have status: done');
        assert(doneContent.includes(`parent_id: ${planId}`), 'done doc must link to plan');
        assert(doneContent.includes(NOTES), 'done doc must contain the verbatim notes');
        assert(!doneContent.includes('TODO: Add implementation notes'), 'done doc must NOT contain a stub placeholder');
        console.log('    ✅ notes written verbatim');

        const planPath = path.join(threadPath, 'plans', `${planId}.md`);
        assert(await fs.pathExists(planPath), `plan must still exist at ${planPath}`);
        const planContent = fsNative.readFileSync(planPath, 'utf8');
        assert(planContent.includes('status: done'), 'plan must have status: done');
        console.log('    ✅ plan finalized in-place with status: done');

        assert(result.planId === planId, 'result.planId must match');
        assert(result.donePath === donePath, 'result.donePath must match');
    }

    // ── test 2: existing per-step done doc + notes → notes appended, not clobbered ─
    console.log('  • closePlan: notes appended as closing section to existing done doc...');
    {
        const loomRoot = await makeLoomRoot();
        const weaveId = 'cp-weave2';
        const weavePath = path.join(loomRoot, 'loom', weaveId);
        const planId = `${weaveId}-plan-001`;

        await createPlanDoc(weavePath, planId, {
            status: 'done',
            steps: [{ order: 1, description: 'Done step', status: 'done' }],
        });
        const donePath = await seedDoneDoc(weavePath, planId, '## Step 1 — Done step\n\nPer-step record from loom_append_done.');

        await closePlan({ planId, notes: 'Closing summary across all steps.' }, makeDeps(loomRoot));

        const updated = await loadDoc(donePath) as any;
        assert(updated.content.includes('Per-step record from loom_append_done.'), 'existing per-step content must be preserved');
        assert(updated.content.includes('## Closing notes'), 'a closing-notes section must be added');
        assert(updated.content.includes('Closing summary across all steps.'), 'closing notes must appear verbatim');
        assert(updated.version === 2, 'done doc version must bump on append');
        console.log('    ✅ notes appended without clobbering per-step records');
    }

    // ── test 3: no notes + existing done doc → finalize, leave done doc untouched ─
    console.log('  • closePlan: no notes but existing done doc → finalize, leave untouched...');
    {
        const loomRoot = await makeLoomRoot();
        const weaveId = 'cp-weave3';
        const weavePath = path.join(loomRoot, 'loom', weaveId);
        const planId = `${weaveId}-plan-001`;

        await createPlanDoc(weavePath, planId, { status: 'implementing' });
        const donePath = await seedDoneDoc(weavePath, planId, '## Step 1 — A\n\nNotes A.');

        await closePlan({ planId }, makeDeps(loomRoot));

        const after = await loadDoc(donePath) as any;
        assert(after.version === 1, 'done doc must be left untouched (version unchanged)');
        assert(!after.content.includes('## Closing notes'), 'no closing section added when no notes given');
        const planContent = fsNative.readFileSync(path.join(weavePath, planId.split('-plan-')[0], 'plans', `${planId}.md`), 'utf8');
        assert(planContent.includes('status: done'), 'plan must still be finalized to status: done');
        console.log('    ✅ existing done doc preserved, plan finalized');
    }

    // ── test 4: no notes + no done doc → throws (no silent stub) ──────────────
    console.log('  • closePlan: no notes and no done doc throws instead of stubbing...');
    {
        const loomRoot = await makeLoomRoot();
        const weaveId = 'cp-weave4';
        const weavePath = path.join(loomRoot, 'loom', weaveId);
        const planId = `${weaveId}-plan-001`;
        await createPlanDoc(weavePath, planId, { status: 'implementing' });

        let threw = false;
        try {
            await closePlan({ planId }, makeDeps(loomRoot));
        } catch (e: any) {
            threw = true;
            assert(/No done content/.test(e.message), 'error must explain the missing done content');
        }
        assert(threw, 'closePlan with no notes and no done doc must throw');

        const donePath = path.join(weavePath, planId.split('-plan-')[0], 'done', `${planId}-done.md`);
        assert(!(await fs.pathExists(donePath)), 'no stub done doc must be written on the error path');
        console.log('    ✅ throws with no content, writes no stub');
    }

    // ── test 5: unknown plan throws ──────────────────────────────────────────
    console.log('  • closePlan: unknown planId throws...');
    {
        const loomRoot = await makeLoomRoot();
        const weaveId = 'cp-weave5';
        const weavePath = path.join(loomRoot, 'loom', weaveId);
        await fs.ensureDir(path.join(weavePath, 'plans'));
        await fs.outputFile(path.join(weavePath, `${weaveId}-design.md`), `---
type: design
id: ${weaveId}-design
title: Design
status: active
created: 2026-04-23
version: 1
tags: []
parent_id: null
child_ids: []
requires_load: []
---
`);
        let threw = false;
        try {
            await closePlan({ planId: `${weaveId}-plan-999`, notes: 'x' }, makeDeps(loomRoot));
        } catch {
            threw = true;
        }
        assert(threw, 'closePlan with unknown plan must throw');
        console.log('    ✅ unknown planId throws correctly');
    }

    await fs.remove(TMP);
    console.log('\n✨ All closePlan use-case tests passed!\n');
}

testClosePlan().catch(err => {
    console.error('❌ close-plan.test.ts failed:', err.message);
    process.exit(1);
});
