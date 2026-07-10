import * as path from 'path';
import * as fs from 'fs-extra';
import * as os from 'os';
import { runLoom, assert, createPlanDoc, setupHermeticLoom } from './test-utils.ts';
import { loadWeave, saveDocs } from '../packages/fs/dist/index.js';
import { completeStep } from '../packages/app/dist/completeStep.js';
import { runEvent } from '../packages/app/dist/runEvent.js';
import { serializeFrontmatter } from '../packages/core/dist/index.js';

// Seed a thread-based design at {weavePath}/{threadSlug}/{threadSlug}-design.md
async function seedThreadDesign(weavePath: string, threadSlug: string, status = 'active'): Promise<void> {
    const threadPath = path.join(weavePath, threadSlug);
    const fm = serializeFrontmatter({
        type: 'design',
        id: `${threadSlug}-design`,
        title: `${threadSlug} Design`,
        status,
        created: new Date().toISOString().split('T')[0],
        version: 1,
        tags: [],
        parent_id: null,
        child_ids: [],
        requires_load: [],
    });
    await fs.outputFile(path.join(threadPath, `${threadSlug}-design.md`), `${fm}\n## Overview\nTest.\n`);
}

// Seed a thread-based plan at {weavePath}/{threadSlug}/plans/{planId}.md
async function seedThreadPlan(weavePath: string, threadSlug: string, planId: string, status = 'draft'): Promise<void> {
    const plansDir = path.join(weavePath, threadSlug, 'plans');
    const fm = serializeFrontmatter({
        type: 'plan',
        id: planId,
        title: `Test Plan ${planId}`,
        status,
        created: new Date().toISOString().split('T')[0],
        version: 1,
        design_version: 1,
        tags: [],
        parent_id: `${threadSlug}-design`,
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

    // Hermetic workspace: an isolated temp root with its own .loom/ marker. The
    // CLI resolves the workspace by walking up from its cwd looking for .loom/
    // (see getActiveLoomRoot), so passing this root as runLoom's cwd is all that's
    // needed — no dependency on, or pollution of, the developer's ~/looms/default.
    const loomRoot = await setupHermeticLoom('loom-commands-tests');
    const weaveSlug = 'example';
    const threadSlug = 'example';
    const weavePath = path.join(loomRoot, 'loom', weaveSlug);

    // Thread-based layout: design and plan inside thread subdir
    await seedThreadDesign(weavePath, threadSlug, 'active');
    console.log('    ✅ Test weave (thread layout) created');

    console.log('  • Testing `loom refine-design`...');
    let result = runLoom(`refine-design ${weaveSlug}`, loomRoot);
    assert(result.exitCode === 0, `refine-design failed: ${result.stderr}`);
    assert(result.stdout.includes('REFINE_DESIGN'), 'Missing REFINE_DESIGN message');
    console.log('    ✅ loom refine-design works');

    console.log('  • Creating test plan (thread layout)...');
    const planId = `${threadSlug}-plan-001`;
    await seedThreadPlan(weavePath, threadSlug, planId, 'draft');
    console.log('    ✅ Test plan created');

    console.log('  • Testing `loom start-plan`...');
    result = runLoom(`start-plan ${planId}`, loomRoot);
    assert(result.exitCode === 0, `start-plan failed: ${result.stderr}`);
    console.log('    ✅ loom start-plan works');

    console.log('  • Testing `loom complete-step`...');
    result = runLoom(`complete-step ${planId} --step 1`, loomRoot);
    assert(result.exitCode === 0, `complete-step failed: ${result.stderr}`);
    console.log('    ✅ loom complete-step works');

    result = runLoom(`status ${weaveSlug} --verbose`, loomRoot);
    assert(result.stdout.includes('1/2 steps'), 'Step progress not updated');
    console.log('    ✅ Plan progress tracked correctly');

    await fs.remove(loomRoot);
    console.log('\n✨ All CLI commands tests passed!\n');
}

async function testCompleteStepUseCase() {
    console.log('\n🧩 Running completeStep use-case tests...\n');

    const loomRoot = path.join(os.tmpdir(), 'loom-complete-step-tests');
    await fs.remove(loomRoot);
    await fs.ensureDir(path.join(loomRoot, '.loom'));
    await fs.outputFile(path.join(loomRoot, '.loom', 'workflow.yml'), 'version: 1\n');

    // Thread-based layout: plan in {weaveSlug}/{threadSlug}/plans/
    const weaveSlug = 'cs-weave';
    const threadSlug = 'cs-feature';
    const weavePath = path.join(loomRoot, 'loom', weaveSlug);
    // Plan ID uses weaveSlug prefix so completeStep can extract weaveSlug via planId.split('-plan-')[0]
    const planId = `${weaveSlug}-plan-001`;

    await seedThreadDesign(weavePath, threadSlug, 'active');
    await seedThreadPlan(weavePath, threadSlug, planId, 'implementing');


    const loadWeaveOrThrow = async (root: string, id: string) => {
        const w = await loadWeave(root, id);
        if (!w) throw new Error(`Weave '${id}' is empty`);
        return w;
    };
    const runEventBound = (wid: string, evt: any) =>
        runEvent(wid, evt, { loadWeave: loadWeaveOrThrow, saveDocs, loomRoot });

    const deps = { loadWeave: loadWeaveOrThrow, runEvent: runEventBound, loomRoot };

    console.log('  • completeStep: mark step 1 done...');
    const r1 = await completeStep({ planUlid: planId, step: 1 }, deps);
    assert(r1.plan.steps[0].status === 'done', 'step 1 must be marked done');
    assert(r1.autoCompleted === false, 'should not auto-complete with step 2 remaining');
    assert(r1.plan.status === 'implementing', 'status must remain implementing');
    console.log('    ✅ step 1 marked done, status still implementing');

    console.log('  • completeStep: mark last step done — plan auto-completes...');
    const r2 = await completeStep({ planUlid: planId, step: 2 }, deps);
    assert(r2.plan.steps[1].status === 'done', 'step 2 must be marked done');
    assert(r2.autoCompleted === true, 'plan must auto-complete');
    assert(r2.plan.status === 'done', 'plan status must be done');
    console.log('    ✅ step 2 done — plan auto-completed');

    console.log('  • completeStep: already-done step throws...');
    let threw = false;
    try {
        await completeStep({ planUlid: planId, step: 1 }, deps);
    } catch {
        threw = true;
    }
    assert(threw, 'completing an already-done step must throw');
    console.log('    ✅ already-done step throws correctly');

    await fs.remove(loomRoot);
    console.log('\n✨ All completeStep use-case tests passed!\n');
}

// Tier 1+2 CLI commands (cli-commands thread): catalog, resources, context, next,
// search, stale, blocked. Each is exercised against a hermetic fixture loom via the
// globally-linked `loom` binary (build-all relinks it before test-all runs).
async function testNewCliCommands() {
    console.log('\n🧵 Running Tier 1+2 CLI command tests...\n');

    const loomRoot = await setupHermeticLoom('loom-tier12-tests');
    const weaveSlug = 'feature';
    const threadSlug = 'feature';
    const weavePath = path.join(loomRoot, 'loom', weaveSlug);
    // Plans are ULID-addressed in the current model, and `loom next` resolves a
    // friendly ref → pl_ ULID at the CLI edge before calling the (strict) do-next-step
    // prompt. Seed with a real pl_ id so `next <planUlid>` exercises that path.
    const planId = 'pl_01KWZ8NEXT0000000000000001';

    // Seed a thread with a design + an implementing plan whose step 2 is blocked by step 1.
    await seedThreadDesign(weavePath, threadSlug, 'active');
    await seedThreadPlan(weavePath, threadSlug, planId, 'implementing');

    // loom catalog — grouped whole-surface index from the in-process MCP server.
    console.log('  • Testing `loom catalog`...');
    let result = runLoom('catalog', loomRoot);
    assert(result.exitCode === 0, `catalog failed: ${result.stderr}`);
    assert(result.stdout.includes('loom_do_step'), 'catalog should list a known tool');
    assert(result.stdout.includes('loom://context/{docUlid}'), 'catalog should list a templated resource');
    assert(result.stdout.includes('do-next-step'), 'catalog should list a prompt');
    console.log('    ✅ loom catalog lists the whole surface');

    // loom catalog resources — the folded resource index (was `loom resources`).
    console.log('  • Testing `loom catalog resources`...');
    result = runLoom('catalog resources', loomRoot);
    assert(result.exitCode === 0, `catalog resources failed: ${result.stderr}`);
    assert(result.stdout.includes('loom://catalog'), 'catalog resources should list loom://catalog');
    assert(!result.stdout.includes('loom_do_step'), 'catalog resources should not include the tools section');
    console.log('    ✅ loom catalog resources lists resources only');

    // loom resources read <uri> — read an arbitrary resource.
    console.log('  • Testing `loom resources read loom://summary`...');
    result = runLoom('resources read loom://summary', loomRoot);
    assert(result.exitCode === 0, `resources read failed: ${result.stderr}`);
    assert(result.stdout.includes('totalWeaves'), 'summary resource should include totalWeaves');
    console.log('    ✅ loom resources read works');

    // loom context <docId> — assembled context bundle for a doc.
    console.log('  • Testing `loom context`...');
    result = runLoom(`context ${threadSlug}-design`, loomRoot);
    assert(result.exitCode === 0, `context failed: ${result.stderr}`);
    assert(result.stdout.includes('loom:context-bundle'), 'context should print a context bundle');
    console.log('    ✅ loom context prints a bundle');

    // loom context <weave>/<thread>/<docSlug> — human-pointable slug-path form.
    console.log('  • Testing `loom context` (slug-path form)...');
    result = runLoom(`context ${weaveSlug}/${threadSlug}/design`, loomRoot);
    assert(result.exitCode === 0, `context slug-path failed: ${result.stderr}`);
    assert(result.stdout.includes('loom:context-bundle'), 'context slug-path should print a bundle');
    console.log('    ✅ loom context resolves the weave/thread/docSlug slug-path form');

    // loom next [plan-id] — next incomplete step for a plan.
    console.log('  • Testing `loom next`...');
    result = runLoom(`next ${planId}`, loomRoot);
    assert(result.exitCode === 0, `next failed: ${result.stderr}`);
    assert(result.stdout.includes('Implement step 1'), 'next should instruct implementing step 1');
    console.log('    ✅ loom next prints the next step');

    // loom search <query> — id/title/content match.
    console.log('  • Testing `loom search`...');
    result = runLoom('search "Second step"', loomRoot);
    assert(result.exitCode === 0, `search failed: ${result.stderr}`);
    assert(result.stdout.includes(planId), 'search should find the plan by content');
    console.log('    ✅ loom search finds docs');

    // loom stale — empty or non-empty, both mention "stale".
    console.log('  • Testing `loom stale`...');
    result = runLoom('stale', loomRoot);
    assert(result.exitCode === 0, `stale failed: ${result.stderr}`);
    assert(result.stdout.toLowerCase().includes('stale'), 'stale output should mention stale');
    console.log('    ✅ loom stale runs');

    // loom blocked — step 2 is blocked by step 1.
    console.log('  • Testing `loom blocked`...');
    result = runLoom('blocked', loomRoot);
    assert(result.exitCode === 0, `blocked failed: ${result.stderr}`);
    assert(result.stdout.includes(planId), 'blocked should list the plan with the blocked step');
    console.log('    ✅ loom blocked lists blocked steps');

    await fs.remove(loomRoot);
    console.log('\n✨ All Tier 1+2 CLI command tests passed!\n');
}

async function runAll() {
    await testCommands();
    await testCompleteStepUseCase();
    await testNewCliCommands();
}

runAll().catch(err => {
    console.error('❌ Test suite failed:', err.message);
    process.exit(1);
});
