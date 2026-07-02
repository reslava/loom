import { assert } from './test-utils.ts';
import { resolveBlockedByIds } from '../packages/core/dist/index.js';

// resolveBlockedByIds is the single write-time normalizer shared by loom_create_plan
// and the ADD_STEP / UPDATE_STEP reducers: numeric / "Step N" blockedBy entries resolve
// to the stable step-id slug at that position; slugs and plan-ids pass through; an
// out-of-range ordinal throws; the result dedupes and a self-block throws.

const eq = (a: unknown, b: unknown) => JSON.stringify(a) === JSON.stringify(b);

function expectThrows(fn: () => void, re: RegExp, label: string): void {
    let threw = false;
    try {
        fn();
    } catch (e) {
        threw = true;
        const msg = (e as Error).message;
        assert(re.test(msg), `${label}: message ${JSON.stringify(msg)} did not match ${re}`);
    }
    assert(threw, `${label}: expected a throw, got none`);
}

async function run() {
    console.log('🔗 Running resolveBlockedByIds tests...\n');
    const ids = ['alpha', 'beta', 'gamma'];

    console.log('  • empty / undefined → []');
    assert(eq(resolveBlockedByIds(undefined, ids), []), 'undefined → []');
    assert(eq(resolveBlockedByIds([], ids), []), 'empty → []');

    console.log('  • numeric ordinals → id at 1-based position');
    assert(eq(resolveBlockedByIds(['1', '3'], ids), ['alpha', 'gamma']), 'numeric ordinals');

    console.log('  • "Step N" form — case-insensitive, whitespace-tolerant');
    assert(eq(resolveBlockedByIds(['Step 2', 'step 3', ' 1 '], ids), ['beta', 'gamma', 'alpha']), 'Step N form');

    console.log('  • slugs and plan ids pass through unchanged');
    assert(eq(resolveBlockedByIds(['beta', 'pl_01ABC'], ids), ['beta', 'pl_01ABC']), 'passthrough');

    console.log('  • mixed ordinal + slug');
    assert(eq(resolveBlockedByIds(['1', 'gamma'], ids), ['alpha', 'gamma']), 'mixed');

    console.log('  • out-of-range ordinal throws (too high, and zero)');
    expectThrows(() => resolveBlockedByIds(['4'], ids), /ordinal "4"/, 'too-high');
    expectThrows(() => resolveBlockedByIds(['0'], ids), /ordinal "0"/, 'zero');

    console.log('  • dedupe collapses an ordinal and the slug it resolves to');
    assert(eq(resolveBlockedByIds(['1', 'alpha', '1'], ids), ['alpha']), 'dedupe');

    console.log('  • self-block rejected (via ordinal or slug)');
    expectThrows(() => resolveBlockedByIds(['2'], ids, 'beta'), /itself/, 'self via ordinal');
    expectThrows(() => resolveBlockedByIds(['beta'], ids, 'beta'), /itself/, 'self via slug');

    console.log('  • a signed number is not an ordinal — passes through');
    assert(eq(resolveBlockedByIds(['-1'], ids), ['-1']), 'signed passthrough');

    console.log('\n✅ resolveBlockedByIds tests passed\n');
}

run().catch(e => { console.error('❌', e); process.exit(1); });
