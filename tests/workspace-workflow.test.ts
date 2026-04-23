import * as path from 'path';
import { ensureDir, pathExists, remove } from 'fs-extra';
import { readdir } from 'fs/promises';
import { assert, mockAIClient } from './test-utils.ts';
import { WORKSPACE_ROOT, setupWorkspace, seedWeave, fileExists, readFile } from './workspace-utils.ts';
import { loadWeave, saveWeave, saveDoc } from '../packages/fs/dist/index.js';
import { completeStep } from '../packages/app/dist/completeStep.js';
import { closePlan } from '../packages/app/dist/closePlan.js';
import { doStep } from '../packages/app/dist/doStep.js';
import { runEvent } from '../packages/app/dist/runEvent.js';

// fs adapter — named imports only (see weaves/tests/references/fs-extra-esm-reference.md)
const fsDeps = {
    ensureDir,
    pathExists,
    remove,
    readdir,
} as any;

function makeRunEvent(loomRoot: string) {
    return (weaveId: string, event: any) =>
        runEvent(weaveId, event, { loadWeave: loadWeave as any, saveWeave, loomRoot });
}

function makeLoadWeave(loomRoot: string) {
    return async (root: string, id: string) => {
        const w = await loadWeave(root, id);
        if (!w) throw new Error(`Weave '${id}' not found in '${root}'`);
        return w;
    };
}

async function testWorkspaceWorkflow() {
    console.log('🏗️  Running workspace-workflow tests (j:/temp/loom)...\n');

    // ── test 1: loadWeave surfaces design + plan from seeded workspace ────────
    console.log('  • loadWeave: design and plan loaded from real workspace...');
    {
        const loomRoot = await setupWorkspace();
        const { weavePath, planId } = await seedWeave(loomRoot, 'ww-weave1');

        const weave = await loadWeave(loomRoot, 'ww-weave1');
        assert(weave !== null, 'weave must load');
        assert(weave!.designs.length === 1, 'must have 1 design');
        assert(weave!.plans.length === 1, 'must have 1 plan');
        assert(weave!.plans[0].id === planId, 'plan id must match');
        console.log('    ✅ loadWeave surfaces design + plan');
    }

    // ── test 2: completeStep marks step done; last step auto-closes plan ──────
    console.log('  • completeStep: step marked done; all steps done → autoCompleted...');
    {
        const loomRoot = await setupWorkspace();
        const { planId } = await seedWeave(loomRoot, 'ww-weave2', { steps: 2 });

        const deps = {
            loadWeave: makeLoadWeave(loomRoot),
            runEvent: makeRunEvent(loomRoot),
            loomRoot,
        };

        // Complete step 1 — plan stays implementing
        const r1 = await completeStep({ planId, step: 1 }, deps);
        assert(r1.autoCompleted === false, 'step 1 must not auto-complete plan');
        assert(r1.plan.steps[0].done === true, 'step 1 must be marked done');

        // Complete step 2 — plan auto-completes
        const r2 = await completeStep({ planId, step: 2 }, deps);
        assert(r2.autoCompleted === true, 'all steps done must auto-complete plan');
        assert(r2.plan.status === 'done', 'plan status must be done after auto-complete');
        console.log('    ✅ completeStep + auto-complete works');
    }

    // ── test 3: closePlan — done/ folder layout ───────────────────────────────
    console.log('  • closePlan: done/ layout — done doc + moved plan + original deleted...');
    {
        const loomRoot = await setupWorkspace();
        const { weavePath, planId } = await seedWeave(loomRoot, 'ww-weave3', { planStatus: 'done' });

        const result = await closePlan(
            { planId },
            {
                loadWeave: makeLoadWeave(loomRoot),
                saveDoc,
                fs: fsDeps,
                aiClient: mockAIClient('## What was built\nWorkspace test.') as any,
                loomRoot,
            }
        );

        const doneDoneDoc = path.join(weavePath, 'done', `${planId}-done.md`);
        const movedPlan   = path.join(weavePath, 'done', `${planId}.md`);
        const oldPlan     = path.join(weavePath, 'plans', `${planId}.md`);

        assert(fileExists(doneDoneDoc), 'done doc must exist at done/{planId}-done.md');
        assert(fileExists(movedPlan),   'plan must be moved to done/{planId}.md');
        assert(!fileExists(oldPlan),    'original plans/{planId}.md must be deleted');

        const doneContent = readFile(doneDoneDoc);
        assert(doneContent.includes('type: done'),         'done doc must have type: done');
        assert(doneContent.includes(`parent_id: ${planId}`), 'done doc must link to plan');
        assert(doneContent.includes('What was built'),     'AI body must appear in done doc');

        const movedContent = readFile(movedPlan);
        assert(movedContent.includes('status: done'), 'moved plan must have status: done');

        console.log('    ✅ closePlan done/ layout correct');
    }

    // ── test 4: doStep — chat doc created in weave root ──────────────────────
    console.log('  • doStep: chat doc created with correct structure...');
    {
        const loomRoot = await setupWorkspace();
        const { weavePath, planId } = await seedWeave(loomRoot, 'ww-weave4');

        const result = await doStep(
            { planId, steps: [1] },
            {
                loadWeave: makeLoadWeave(loomRoot),
                saveDoc,
                fs: fsDeps,
                aiClient: mockAIClient('Do this and that.') as any,
                loomRoot,
            }
        );

        assert(fileExists(result.chatPath), 'chat doc must exist');
        const content = readFile(result.chatPath);
        assert(content.includes('# CHAT'),            'chat doc must have # CHAT header');
        assert(content.includes('## Rafa:'),           'chat doc must have ## Rafa: section');
        assert(content.includes('## AI:'),             'chat doc must have ## AI: section');
        assert(content.includes('Do this and that.'),  'AI response must appear in chat doc');
        assert(content.includes(`parent_id: ${planId}`), 'parent_id must link to plan');
        console.log('    ✅ doStep creates chat doc correctly');
    }

    // ── test 5 (data layer): loadWeave after full workflow ───────────────────
    console.log('  • data layer: loadWeave surfaces plans, dones, chats after full workflow...');
    {
        const loomRoot = await setupWorkspace();
        const { planId } = await seedWeave(loomRoot, 'ww-weave5', { planStatus: 'implementing', steps: 1 });

        // Run doStep → closePlan (single-step plan, status already implementing)
        const loadW = makeLoadWeave(loomRoot);

        await doStep(
            { planId, steps: [1] },
            { loadWeave: loadW, saveDoc, fs: fsDeps, aiClient: mockAIClient('Step guidance.') as any, loomRoot }
        );

        await closePlan(
            { planId },
            { loadWeave: loadW, saveDoc, fs: fsDeps, aiClient: mockAIClient('Done summary.') as any, loomRoot }
        );

        const weave = await loadWeave(loomRoot, 'ww-weave5');
        assert(weave !== null, 'weave must load');
        assert(weave!.chats.length >= 1,  'weave must surface chat doc');
        assert(weave!.dones.length === 1,  'weave must surface done doc');
        assert(weave!.designs.length === 1, 'weave must still surface design');
        // Plan is moved to done/ — weaveRepository loads plans from both plans/ and done/
        const allPlans = weave!.plans;
        assert(allPlans.length >= 1, 'moved plan must still be surfaced');
        console.log('    ✅ data layer: plans, dones, chats all surfaced after full workflow');
    }

    console.log('\n✨ All workspace-workflow tests passed!\n');
}

testWorkspaceWorkflow().catch(err => {
    console.error('❌ workspace-workflow.test.ts failed:', err.message);
    process.exit(1);
});
