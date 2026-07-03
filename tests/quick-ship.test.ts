import * as path from 'path';
import * as fs from 'fs-extra';
import * as os from 'os';
import { assert, createPlanDoc } from './test-utils.ts';
import { loadWeave, saveDoc, saveDocs, loadDoc } from '../packages/fs/dist/index.js';
import { quickShip } from '../packages/app/dist/quickShip.js';
import { createThread } from '../packages/app/dist/thread.js';

const TMP = path.join(os.tmpdir(), 'loom-quick-ship-tests');

async function makeLoomRoot(): Promise<string> {
    await fs.remove(TMP);
    await fs.ensureDir(path.join(TMP, '.loom'));
    await fs.outputFile(path.join(TMP, '.loom', 'workflow.yml'), 'version: 1\n');
    return TMP;
}

/** Explicitly mint a thread (no more auto-scaffold seam) and return its stable th_ ULID. */
async function makeThread(loomRoot: string, weaveId: string, slug: string): Promise<string> {
    const { id } = await createThread(
        { weaveSlug: weaveId, threadSlug: slug },
        { getActiveLoomRoot: () => loomRoot, saveDoc, fs },
    );
    return id;
}

function makeDeps(loomRoot: string) {
    const loadWeaveStrict = async (root: string, id: string) => {
        const w = await loadWeave(root, id);
        if (!w) throw new Error(`Weave '${id}' is empty`);
        return w;
    };
    return { loadWeave: loadWeaveStrict, saveDoc, saveDocs, loadDoc, fs, loomRoot };
}

async function findPlan(loomRoot: string, weaveId: string, planId: string) {
    const weave = await loadWeave(loomRoot, weaveId);
    return weave!.threads.flatMap((t: any) => t.plans).find((p: any) => p.id === planId);
}

async function run() {
    console.log('📦 Running quickShip use-case tests...\n');

    // ── (a) existing thread, single-line description → one done plan, one done step ──
    console.log('  • quickShip: existing thread, single line → one done plan...');
    {
        const loomRoot = await makeLoomRoot();
        const weaveId = 'qs-weave-a';
        const threadUlid = await makeThread(loomRoot, weaveId, 'fast-fixes');
        const result = await quickShip(
            { weaveSlug: weaveId, threadUlid, description: 'fixed the serializer typo' },
            makeDeps(loomRoot),
        );
        assert(result.stepCount === 1, 'single description → 1 step');
        assert(result.createdThread === false, 'existing-thread branch does not mint a thread');
        const plan = await findPlan(loomRoot, weaveId, result.planId);
        assert(!!plan, 'quick-shipped plan must exist in state');
        assert(plan.status === 'done', `plan must be done, got ${plan.status}`);
        assert(plan.steps.length === 1 && plan.steps[0].status === 'done', 'the one step must be done');
        assert(await fs.pathExists(result.donePath), 'done doc must exist');
        console.log('    ✅ existing thread, single line → one done plan');
    }

    // ── (b) existing thread, array description → one done plan, all steps done ──
    console.log('  • quickShip: existing thread, short list → all steps done...');
    {
        const loomRoot = await makeLoomRoot();
        const weaveId = 'qs-weave-b';
        const threadUlid = await makeThread(loomRoot, weaveId, 'fast-fixes');
        const result = await quickShip(
            { weaveSlug: weaveId, threadUlid, description: ['did A', 'did B', 'did C'] },
            makeDeps(loomRoot),
        );
        assert(result.stepCount === 3, 'array of 3 → 3 steps');
        const plan = await findPlan(loomRoot, weaveId, result.planId);
        assert(plan.status === 'done', 'plan must be done');
        assert(plan.steps.length === 3, 'plan must have 3 steps');
        assert(plan.steps.every((s: any) => s.status === 'done'), 'all steps must be done');
        console.log('    ✅ existing thread, short list → one done plan, all steps done');
    }

    // ── (c) new-thread branch → thread minted + done plan ──
    console.log('  • quickShip: new-thread branch mints thread.md + done plan...');
    {
        const loomRoot = await makeLoomRoot();
        const weaveId = 'qs-weave-c';
        const result = await quickShip(
            { weaveSlug: weaveId, newThread: { slug: 'standalone-fix', title: 'Standalone fix' }, description: 'one-off fix' },
            makeDeps(loomRoot),
        );
        assert(result.createdThread === true, 'newThread branch must report createdThread');
        assert(/^th_/.test(result.threadUlid), 'threadUlid must be the minted thread ULID');
        const threadManifest = path.join(loomRoot, 'loom', weaveId, 'standalone-fix', 'thread.md');
        assert(await fs.pathExists(threadManifest), 'thread.md must be minted');
        const plan = await findPlan(loomRoot, weaveId, result.planId);
        assert(!!plan && plan.status === 'done', 'the new thread must carry a done plan');
        console.log('    ✅ new-thread branch mints thread.md + a done plan');
    }

    // ── (d) invariant: an existing implementing plan is left untouched ──
    console.log('  • quickShip: existing implementing plan left untouched...');
    {
        const loomRoot = await makeLoomRoot();
        const weaveId = 'qs-weave-d';
        const weavePath = path.join(loomRoot, 'loom', weaveId);
        const existingPlanId = `${weaveId}-plan-001`;
        const existingPlanPath = await createPlanDoc(weavePath, existingPlanId, { status: 'implementing' });
        const before = await fs.readFile(existingPlanPath, 'utf8');

        const threadUlid = await makeThread(loomRoot, weaveId, 'qs-thread-d');
        const result = await quickShip(
            { weaveSlug: weaveId, threadUlid, description: 'a side fix that arose mid-plan' },
            makeDeps(loomRoot),
        );
        assert(result.planId !== existingPlanId, 'quick-ship must mint a NEW plan, not reuse the existing one');
        const qsPlan = await findPlan(loomRoot, weaveId, result.planId);
        assert(qsPlan.status === 'done', 'quick-shipped plan must be done');
        const after = await fs.readFile(existingPlanPath, 'utf8');
        assert(after === before, 'the pre-existing implementing plan must be left byte-identical (untouched)');
        console.log('    ✅ invariant: existing implementing plan untouched; a new done plan minted');
    }

    // ── (e) validation: missing/both target and empty description throw ──
    console.log('  • quickShip: input validation...');
    {
        const loomRoot = await makeLoomRoot();
        const weaveId = 'qs-weave-e';
        let threw = 0;
        try { await quickShip({ weaveSlug: weaveId, description: 'x' } as any, makeDeps(loomRoot)); } catch { threw++; }
        try { await quickShip({ weaveSlug: weaveId, threadUlid: 't',newThread: { slug: 's' }, description: 'x' }, makeDeps(loomRoot)); } catch { threw++; }
        try { await quickShip({ weaveSlug: weaveId, threadUlid: 't',description: '   ' }, makeDeps(loomRoot)); } catch { threw++; }
        try { await quickShip({ weaveSlug: weaveId, threadUlid: 't',description: [] }, makeDeps(loomRoot)); } catch { threw++; }
        assert(threw === 4, `all four invalid inputs must throw (got ${threw})`);
        console.log('    ✅ validation: missing/both target and empty description throw');
    }

    await fs.remove(TMP);
    console.log('\n✨ All quickShip use-case tests passed!\n');
}

run().catch(err => {
    console.error('❌ quick-ship.test.ts failed:', err.message);
    process.exit(1);
});
