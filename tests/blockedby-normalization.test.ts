import * as path from 'path';
import * as fs from 'fs-extra';
import * as os from 'os';
import { assert } from './test-utils.ts';
import { loadDoc, loadWeave, saveDoc } from '../packages/fs/dist/index.js';
import { weavePlan } from '../packages/app/dist/weavePlan.js';
import { createThread } from '../packages/app/dist/thread.js';
import { planReducer } from '../packages/core/dist/reducers/planReducer.js';

// Integration coverage for the blockedBy ordinal→slug normalization wired into
// both write paths: loom_create_plan (weavePlan.buildStructuredSteps) and the
// ADD_STEP / UPDATE_STEP reducers. The pure resolver is unit-tested separately in
// resolve-blockedby-ids.test.ts; this proves the wiring persists slug ids.

const TMP = path.join(os.tmpdir(), 'loom-blockedby-normalization-tests');

async function rejects(fn: () => Promise<unknown>, needle: string, label: string) {
    let threw = false;
    try {
        await fn();
    } catch (e) {
        threw = true;
        const msg = (e as Error).message;
        assert(msg.includes(needle), `${label}: error mentions "${needle}" (got: ${msg})`);
    }
    assert(threw, `${label}: should have thrown`);
}

const eq = (a: unknown, b: unknown) => JSON.stringify(a) === JSON.stringify(b);

function mkStep(id: string, order: number, blockedBy: string[] = []): any {
    return { id, order, status: 'pending', title: id, description: id, files_touched: [], blockedBy, satisfies: [] };
}

async function run() {
    console.log('🔗 Running blockedBy-normalization integration tests...\n');
    const root = path.join(TMP, 'ws');
    await fs.remove(root);
    await fs.ensureDir(path.join(root, 'loom', 'demo'));
    const deps = { loadWeave, saveDoc, loadDoc, fs, loomRoot: root } as any;
    const { id: threadUlid } = await createThread({ weaveId: 'demo', threadId: 'demo' }, { getActiveLoomRoot: () => root, saveDoc, fs });
    const base = { weaveId: 'demo', threadId: threadUlid };

    // 1. Create path: numeric blockedBy ordinals persist as stable slug ids.
    const created = await weavePlan({
        ...base, goal: 'Normalize.',
        steps: [
            { description: 'Alpha', title: 'alpha' },
            { description: 'Beta', title: 'beta', blockedBy: ['1'] },
            { description: 'Gamma', title: 'gamma', blockedBy: ['1', '2'] },
        ],
    } as any, deps);
    const plan: any = await loadDoc(created.filePath);
    assert(eq(plan.steps.map((s: any) => s.id), ['alpha', 'beta', 'gamma']), 'step ids are the title slugs');
    assert(eq(plan.steps[1].blockedBy, ['alpha']), `beta.blockedBy → ['alpha'] (got ${JSON.stringify(plan.steps[1].blockedBy)})`);
    assert(eq(plan.steps[2].blockedBy, ['alpha', 'beta']), `gamma.blockedBy → ['alpha','beta'] (got ${JSON.stringify(plan.steps[2].blockedBy)})`);
    console.log('  ✓ create: ordinal blockedBy persisted as slug ids');

    // 2. Create path: slug + plan-id entries pass through untouched.
    const created2 = await weavePlan({
        ...base, goal: 'Passthrough.',
        steps: [
            { description: 'One', title: 'one' },
            { description: 'Two', title: 'two', blockedBy: ['one', 'pl_01ABCDEF'] },
        ],
    } as any, deps);
    const plan2: any = await loadDoc(created2.filePath);
    assert(eq(plan2.steps[1].blockedBy, ['one', 'pl_01ABCDEF']), `slug + plan-id pass through (got ${JSON.stringify(plan2.steps[1].blockedBy)})`);
    console.log('  ✓ create: slug + plan-id blockedBy pass through');

    // 3. Create path: an out-of-range ordinal hard-errors (no fragile plan is born).
    await rejects(
        () => weavePlan({ ...base, goal: 'x', steps: [{ description: 'Only', title: 'only', blockedBy: ['5'] }] } as any, deps),
        'ordinal "5"',
        'create out-of-range ordinal',
    );
    console.log('  ✓ create: out-of-range ordinal → throws');

    // 4. UPDATE_STEP reducer: a numeric blockedBy patch normalizes to a slug id.
    const doc: any = { id: 'pl_x', status: 'implementing', steps: [mkStep('a', 1), mkStep('b', 2), mkStep('c', 3)] };
    const afterUpdate = planReducer(doc, { type: 'UPDATE_STEP', stepId: 'c', patch: { blockedBy: ['1'] } } as any);
    assert(eq(afterUpdate.steps[2].blockedBy, ['a']), `update: ['1'] → ['a'] (got ${JSON.stringify(afterUpdate.steps[2].blockedBy)})`);
    await rejects(
        async () => planReducer(doc, { type: 'UPDATE_STEP', stepId: 'c', patch: { blockedBy: ['9'] } } as any),
        'ordinal "9"',
        'update out-of-range ordinal',
    );
    console.log('  ✓ update-step: numeric blockedBy → slug id; out-of-range throws');

    // 5. ADD_STEP reducer: the new step's numeric blockedBy resolves against the final order.
    const afterAdd = planReducer(doc, { type: 'ADD_STEP', step: { description: 'D', title: 'd', blockedBy: ['2'] }, position: 'append' } as any);
    const added = afterAdd.steps.find((s: any) => s.id === 'd');
    assert(!!added && eq(added.blockedBy, ['b']), `add: ['2'] → ['b'] (got ${JSON.stringify(added?.blockedBy)})`);
    console.log('  ✓ add-step: numeric blockedBy → slug id (final-order)');

    // 6. Reorder keeps slug edges pointing at the same logical steps.
    const withEdge: any = { id: 'pl_y', status: 'implementing', steps: [mkStep('a', 1), mkStep('b', 2, ['a']), mkStep('c', 3)] };
    const reordered = planReducer(withEdge, { type: 'REORDER_STEPS', orderedStepIds: ['c', 'b', 'a'] } as any);
    const bAfter = reordered.steps.find((s: any) => s.id === 'b');
    assert(!!bAfter && eq(bAfter.blockedBy, ['a']), `reorder: slug edge survives (got ${JSON.stringify(bAfter?.blockedBy)})`);
    console.log('  ✓ reorder: slug-id edges survive a reorder');

    await fs.remove(TMP);
    console.log('\n✅ blockedBy-normalization integration tests passed\n');
}

run().catch(e => { console.error('❌', e); process.exit(1); });
