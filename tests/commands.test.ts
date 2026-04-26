import * as path from 'path';
import * as fs from 'fs-extra';
import * as os from 'os';
import { runLoom, assert, createPlanDoc } from './test-utils.ts';
import { loadWeave, saveWeave } from '../packages/fs/dist/index.js';
import { completeStep } from '../packages/app/dist/completeStep.js';
import { runEvent } from '../packages/app/dist/runEvent.js';
import { serializeFrontmatter } from '../packages/core/dist/index.js';

// Seed a thread-based design at {weavePath}/{threadId}/{threadId}-design.md
async function seedThreadDesign(weavePath: string, threadId: string, status = 'active'): Promise<void> {
    const threadPath = path.join(weavePath, threadId);
    const fm = serializeFrontmatter({
        type: 'design',
        id: `${threadId}-design`,
        title: `${threadId} Design`,
        status,
        created: new Date().toISOString().split('T')[0],
        version: 1,
        tags: [],
        parent_id: null,
        child_ids: [],
        requires_load: [],
    });
    await fs.outputFile(path.join(threadPath, `${threadId}-design.md`), `${fm}\n## Overview\nTest.\n`);
}

// Seed a thread-based plan at {weavePath}/{threadId}/plans/{planId}.md
async function seedThreadPlan(weavePath: string, threadId: string, planId: string, status = 'draft'): Promise<void> {
    const plansDir = path.join(weavePath, threadId, 'plans');
    const fm = serializeFrontmatter({
        type: 'plan',
        id: planId,
        title: `Test Plan ${planId}`,
        status,
        created: new Date().toISOString().split('T')[0],
        version: 1,
        design_version: 1,
        tags: [],
        parent_id: `${threadId}-design`,
        target_version: '1.0.0',
        requires_load: [],
    });
    const planContent = `${fm}
# Goal
Test plan.

## Steps
| Done | # | Step | Files touched | Blocked by |
|------|---|------|---------------|------------|
| 🔳 | 1 | First step | src/ | — |
| 🔳 | 2 | Second step | src/ | Step 1 |
`;
    await fs.outputFile(path.join(plansDir, `${planId}.md`), planContent);
}

async function testCommands() {
    console.log('🧵 Running CLI commands tests...\n');

    const globalLoomPath = path.join(os.homedir(), 'looms', 'default');
    const weavePath = path.join(globalLoomPath, 'loom', 'example');
    const threadId = 'example';
    await fs.remove(weavePath);

    console.log('  • Ensuring global loom exists...');
    let result = runLoom('init');

    // Thread-based layout: design and plan inside thread subdir
    await seedThreadDesign(weavePath, threadId, 'active');
    console.log('    ✅ Test weave (thread layout) created');

    process.chdir(globalLoomPath);

    console.log('  • Testing `loom refine-design`...');
    result = runLoom('refine-design example');
    assert(result.exitCode === 0, `refine-design failed: ${result.stderr}`);
    assert(result.stdout.includes('REFINE_DESIGN'), 'Missing REFINE_DESIGN message');
    console.log('    ✅ loom refine-design works');

    console.log('  • Testing `loom summarise-context`...');
    result = runLoom('summarise-context example');
    if (result.stderr.includes('No AI client configured')) {
        console.log('    ⚠️  summarise-context skipped — no API key configured');
    } else {
        assert(result.exitCode === 0, `summarise-context failed: ${result.stderr}`);
        console.log('    ✅ loom summarise-context works');
    }

    console.log('  • Creating test plan (thread layout)...');
    const planId = `${threadId}-plan-001`;
    await seedThreadPlan(weavePath, threadId, planId, 'draft');
    console.log('    ✅ Test plan created');

    console.log('  • Testing `loom start-plan`...');
    result = runLoom(`start-plan ${planId}`);
    assert(result.exitCode === 0, `start-plan failed: ${result.stderr}`);
    console.log('    ✅ loom start-plan works');

    console.log('  • Testing `loom complete-step`...');
    result = runLoom(`complete-step ${planId} --step 1`);
    assert(result.exitCode === 0, `complete-step failed: ${result.stderr}`);
    console.log('    ✅ loom complete-step works');

    result = runLoom('status example --verbose');
    assert(result.stdout.includes('1/2 steps'), 'Step progress not updated');
    console.log('    ✅ Plan progress tracked correctly');

    await fs.remove(weavePath);
    console.log('\n✨ All CLI commands tests passed!\n');
}

async function testCompleteStepUseCase() {
    console.log('\n🧩 Running completeStep use-case tests...\n');

    const loomRoot = path.join(os.tmpdir(), 'loom-complete-step-tests');
    await fs.remove(loomRoot);
    await fs.ensureDir(path.join(loomRoot, '.loom'));
    await fs.outputFile(path.join(loomRoot, '.loom', 'workflow.yml'), 'version: 1\n');

    // Thread-based layout: plan in {weaveId}/{threadId}/plans/
    const weaveId = 'cs-weave';
    const threadId = 'cs-feature';
    const weavePath = path.join(loomRoot, 'loom', weaveId);
    // Plan ID uses weaveId prefix so completeStep can extract weaveId via planId.split('-plan-')[0]
    const planId = `${weaveId}-plan-001`;

    await seedThreadDesign(weavePath, threadId, 'active');
    await seedThreadPlan(weavePath, threadId, planId, 'implementing');


    const loadWeaveOrThrow = async (root: string, id: string) => {
        const w = await loadWeave(root, id);
        if (!w) throw new Error(`Weave '${id}' is empty`);
        return w;
    };
    const runEventBound = (wid: string, evt: any) =>
        runEvent(wid, evt, { loadWeave: loadWeaveOrThrow, saveWeave, loomRoot });

    const deps = { loadWeave: loadWeaveOrThrow, runEvent: runEventBound, loomRoot };

    console.log('  • completeStep: mark step 1 done...');
    const r1 = await completeStep({ planId, step: 1 }, deps);
    assert(r1.plan.steps[0].done === true, 'step 1 must be marked done');
    assert(r1.autoCompleted === false, 'should not auto-complete with step 2 remaining');
    assert(r1.plan.status === 'implementing', 'status must remain implementing');
    console.log('    ✅ step 1 marked done, status still implementing');

    console.log('  • completeStep: mark last step done — plan auto-completes...');
    const r2 = await completeStep({ planId, step: 2 }, deps);
    assert(r2.plan.steps[1].done === true, 'step 2 must be marked done');
    assert(r2.autoCompleted === true, 'plan must auto-complete');
    assert(r2.plan.status === 'done', 'plan status must be done');
    console.log('    ✅ step 2 done — plan auto-completed');

    console.log('  • completeStep: already-done step throws...');
    let threw = false;
    try {
        await completeStep({ planId, step: 1 }, deps);
    } catch {
        threw = true;
    }
    assert(threw, 'completing an already-done step must throw');
    console.log('    ✅ already-done step throws correctly');

    await fs.remove(loomRoot);
    console.log('\n✨ All completeStep use-case tests passed!\n');
}

async function runAll() {
    await testCommands();
    await testCompleteStepUseCase();
}

runAll().catch(err => {
    console.error('❌ Test suite failed:', err.message);
    process.exit(1);
});
