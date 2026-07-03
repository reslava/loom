import * as path from 'path';
import * as fs from 'fs-extra';
import * as os from 'os';
import { assert } from './test-utils.ts';
import { loadDoc, loadWeave, saveDoc } from '../packages/fs/dist/index.js';
import { weavePlan } from '../packages/app/dist/weavePlan.js';
import { createThread } from '../packages/app/dist/thread.js';

const TMP = path.join(os.tmpdir(), 'loom-create-plan-hardening-tests');

// Asserts `fn` rejects, and that the rejection message includes `needle`.
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

// Count plan files actually written under the thread (corruption must leave nothing behind).
async function planCount(root: string): Promise<number> {
    const dir = path.join(root, 'loom', 'demo', 'demo', 'plans');
    const files = await fs.readdir(dir).catch(() => [] as string[]);
    return files.filter(f => f.endsWith('.md')).length;
}

async function run() {
    const root = path.join(TMP, 'ws');
    await fs.remove(root);
    await fs.ensureDir(path.join(root, 'loom', 'demo'));
    const deps = { loadWeave, saveDoc, loadDoc, fs, loomRoot: root } as any;
    const { id: threadUlid } = await createThread({ weaveSlug: 'demo', threadSlug: 'demo' }, { getActiveLoomRoot: () => root, saveDoc, fs });
    const base = { weaveSlug: 'demo', threadUlid };

    // 1. Body leak — the observed failure: wire markers in `goal` must hard-error,
    //    not serialize into the body. (steps undefined here, exactly as observed.)
    await rejects(
        () => weavePlan({ ...base, goal: 'Do the thing.</goal><parameter name="steps">[{"description":"x"}]' } as any, deps),
        'wire markers',
        'goal body-leak',
    );
    assert((await planCount(root)) === 0, 'body-leak goal wrote no plan file');
    console.log('  ✓ wire-marker leak in goal → throws, no file written');

    // 2. Same guard on title.
    await rejects(
        () => weavePlan({ ...base, title: 'Plan</goal>', goal: 'ok' } as any, deps),
        'wire markers',
        'title body-leak',
    );
    console.log('  ✓ wire-marker leak in title → throws');

    // 3. Stringified steps that ARE valid JSON → coerced, not dropped to [].
    const coerced = await weavePlan({
        ...base, goal: 'Build it.',
        steps: JSON.stringify([{ description: 'First' }, { description: 'Second' }]),
    } as any, deps);
    const coercedPlan: any = await loadDoc(coerced.filePath);
    assert(coercedPlan.steps.length === 2, `stringified steps coerced to array (got ${coercedPlan.steps.length})`);
    console.log('  ✓ stringified-but-valid steps → JSON.parsed, persisted (not silently [])');

    // 4. Stringified steps that are NOT valid JSON → hard error (never silent []).
    await rejects(
        () => weavePlan({ ...base, goal: 'x', steps: '[{description: broken' } as any, deps),
        'unparseable',
        'unparseable steps string',
    );
    console.log('  ✓ unparseable steps string → throws');

    // 5. steps not an array (object) → error.
    await rejects(
        () => weavePlan({ ...base, goal: 'x', steps: { description: 'nope' } } as any, deps),
        'must be an array',
        'non-array steps',
    );
    console.log('  ✓ non-array steps → throws');

    // 6. A step missing its description → error (schema `required` is not runtime-enforced
    //    when args bypass host validation; coerceSteps catches it).
    await rejects(
        () => weavePlan({ ...base, goal: 'x', steps: [{ title: 'no desc' }] } as any, deps),
        'non-empty "description"',
        'step without description',
    );
    console.log('  ✓ step missing description → throws');

    // 7. Happy path still works: structured array, clean goal → well-formed plan.
    const ok = await weavePlan({
        ...base, goal: 'Ship it.', steps: [{ description: 'Only step' }],
    } as any, deps);
    const okPlan: any = await loadDoc(ok.filePath);
    assert(okPlan.steps.length === 1 && okPlan.steps[0].description === 'Only step', 'clean structured input → well-formed plan');
    console.log('  ✓ clean structured input → well-formed plan');

    await fs.remove(TMP);
    console.log('✅ create-plan-hardening tests passed');
}

run().catch(e => { console.error(e); process.exit(1); });
