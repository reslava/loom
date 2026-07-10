import * as path from 'path';
import * as fs from 'fs-extra';
import * as os from 'os';
import { assert, createPlanDoc } from './test-utils.ts';
import { loadDoc } from '../packages/fs/dist/index.js';
import { handle as appendDoneHandle } from '../packages/mcp/dist/tools/appendDone.js';

const TMP = path.join(os.tmpdir(), 'loom-append-done-tests');
// Plans are addressed by their stable pl_ ULID (strict API contract); the filename
// stays a human plan-NNN.md. Each test uses a fresh root, so one ULID is reusable.
const PLAN_ULID = 'pl_APPENDDONE0000000000000001';

async function makeLoomRoot(): Promise<string> {
    await fs.remove(TMP);
    await fs.ensureDir(path.join(TMP, '.loom'));
    await fs.outputFile(path.join(TMP, '.loom', 'workflow.yml'), 'version: 1\n');
    return TMP;
}

function parseResult(res: any) {
    return JSON.parse(res.content[0].text);
}

async function donePathFor(weavePath: string, planId: string) {
    const threadSlug = planId.split('-plan-')[0];
    // New scheme: done filename humanises to plan-NNN-done.md (mirrors the plan's ordinal).
    const ord = planId.match(/-plan-(\d+)$/)?.[1] ?? '001';
    return path.join(weavePath, threadSlug, 'done', `plan-${ord}-done.md`);
}

async function run() {
    console.log('📝 Running loom_append_done tests...\n');

    // ── test 1: single-step form creates the done doc ────────────────────────
    console.log('  • append_done: single { stepNumber, notes } creates done doc...');
    {
        const root = await makeLoomRoot();
        const weaveSlug = 'ad-weave1';
        const weavePath = path.join(root, 'loom', weaveSlug);
        const planId = `${weaveSlug}-plan-001`;
        await createPlanDoc(weavePath, planId, { id: PLAN_ULID,
            status: 'implementing',
            steps: [
                { order: 1, description: 'Build the thing', status: 'pending' },
                { order: 2, description: 'Test the thing', status: 'pending' },
            ],
        });

        const res = parseResult(await appendDoneHandle(root, { plan_ulid: PLAN_ULID, stepNumber: 1, notes: 'Edited foo.ts' }));
        assert(res.created === true, 'first call must create the done doc');
        assert(JSON.stringify(res.stepNumbers) === JSON.stringify([1]), 'stepNumbers must be [1]');

        const donePath = await donePathFor(weavePath, planId);
        const doc = await loadDoc(donePath) as any;
        assert(doc.content.includes('## Step 1 — Build the thing'), 'must have step 1 section header');
        assert(doc.content.includes('Edited foo.ts'), 'must contain step 1 notes');
        console.log('    ✅ single form creates done doc with the step section');
    }

    // ── test 2: batch form writes the WHOLE done doc in one call ──────────────
    console.log('  • append_done: batch `steps` array writes all sections in one call...');
    {
        const root = await makeLoomRoot();
        const weaveSlug = 'ad-weave2';
        const weavePath = path.join(root, 'loom', weaveSlug);
        const planId = `${weaveSlug}-plan-001`;
        await createPlanDoc(weavePath, planId, { id: PLAN_ULID,
            status: 'implementing',
            steps: [
                { order: 1, description: 'Step one', status: 'done' },
                { order: 2, description: 'Step two', status: 'done' },
                { order: 3, description: 'Step three', status: 'done' },
            ],
        });

        // Provide out of order to prove the tool orders by step number.
        const res = parseResult(await appendDoneHandle(root, {
            plan_ulid: PLAN_ULID,
            steps: [
                { stepNumber: 3, notes: 'Did three' },
                { stepNumber: 1, notes: 'Did one' },
                { stepNumber: 2, notes: 'Did two' },
            ],
        }));
        assert(res.created === true, 'batch on fresh plan must create the done doc');
        assert(JSON.stringify(res.stepNumbers) === JSON.stringify([3, 1, 2]), 'stepNumbers echoes input order');

        const donePath = await donePathFor(weavePath, planId);
        const doc = await loadDoc(donePath) as any;
        const i1 = doc.content.indexOf('## Step 1 —');
        const i2 = doc.content.indexOf('## Step 2 —');
        const i3 = doc.content.indexOf('## Step 3 —');
        assert(i1 >= 0 && i2 >= 0 && i3 >= 0, 'all three sections present');
        assert(i1 < i2 && i2 < i3, 'sections ordered by step number regardless of input order');
        assert(doc.content.includes('Did one') && doc.content.includes('Did two') && doc.content.includes('Did three'), 'all notes present');
        console.log('    ✅ batch form writes the whole done doc, ordered');
    }

    // ── test 3: idempotent replace + version bump on existing doc ─────────────
    console.log('  • append_done: re-recording a step replaces its section and bumps version...');
    {
        const root = await makeLoomRoot();
        const weaveSlug = 'ad-weave3';
        const weavePath = path.join(root, 'loom', weaveSlug);
        const planId = `${weaveSlug}-plan-001`;
        await createPlanDoc(weavePath, planId, { id: PLAN_ULID,
            status: 'implementing',
            steps: [{ order: 1, description: 'Only step', status: 'pending' }],
        });

        await appendDoneHandle(root, { plan_ulid: PLAN_ULID, stepNumber: 1, notes: 'first take' });
        const res2 = parseResult(await appendDoneHandle(root, { plan_ulid: PLAN_ULID, stepNumber: 1, notes: 'second take' }));
        assert(res2.created === false, 'second call must update, not create');

        const donePath = await donePathFor(weavePath, planId);
        const doc = await loadDoc(donePath) as any;
        assert(doc.content.includes('second take'), 'new notes present');
        assert(!doc.content.includes('first take'), 'old notes replaced, not duplicated');
        assert((doc.content.match(/## Step 1 —/g) || []).length === 1, 'exactly one step-1 section');
        assert(doc.version === 2, 'version bumped to 2 on update');
        console.log('    ✅ idempotent replace + version bump');
    }

    // ── test 4: a missing step throws and writes nothing (atomic) ─────────────
    console.log('  • append_done: unknown step number throws, no partial write...');
    {
        const root = await makeLoomRoot();
        const weaveSlug = 'ad-weave4';
        const weavePath = path.join(root, 'loom', weaveSlug);
        const planId = `${weaveSlug}-plan-001`;
        await createPlanDoc(weavePath, planId, { id: PLAN_ULID,
            status: 'implementing',
            steps: [{ order: 1, description: 'Real step', status: 'pending' }],
        });

        let threw = false;
        try {
            await appendDoneHandle(root, { plan_ulid: PLAN_ULID, steps: [{ stepNumber: 1, notes: 'ok' }, { stepNumber: 99, notes: 'nope' }] });
        } catch (e: any) {
            threw = true;
            assert(/Step 99 not found/.test(e.message), 'error names the missing step');
        }
        assert(threw, 'batch with an unknown step must throw');
        const donePath = await donePathFor(weavePath, planId);
        assert(!(await fs.pathExists(donePath)), 'no done doc written when validation fails');
        console.log('    ✅ unknown step throws, nothing written');
    }

    // ── test 5: neither single nor batch input throws ────────────────────────
    console.log('  • append_done: missing stepNumber and steps throws...');
    {
        const root = await makeLoomRoot();
        const weaveSlug = 'ad-weave5';
        const weavePath = path.join(root, 'loom', weaveSlug);
        const planId = `${weaveSlug}-plan-001`;
        await createPlanDoc(weavePath, planId, { id: PLAN_ULID,
            status: 'implementing',
            steps: [{ order: 1, description: 'Real step', status: 'pending' }],
        });

        let threw = false;
        try {
            await appendDoneHandle(root, { plan_ulid: PLAN_ULID });
        } catch {
            threw = true;
        }
        assert(threw, 'no stepNumber and no steps must throw');
        console.log('    ✅ empty input throws');
    }

    await fs.remove(TMP);
    console.log('\n✨ All loom_append_done tests passed!\n');
}

run().catch(err => {
    console.error('❌ append-done.test.ts failed:', err.message);
    process.exit(1);
});
