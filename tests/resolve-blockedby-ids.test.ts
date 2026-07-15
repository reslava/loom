import { assert } from './test-utils.ts';
import { resolveBlockedByIds } from '../packages/core/dist/index.js';

// resolveBlockedByIds is the single write-time normalizer shared by loom_create_plan
// and the ADD_STEP / UPDATE_STEP reducers: numeric / "Step N" blockedBy entries resolve
// to the stable step-id slug at that position; KNOWN slugs and plan-ids pass through; an
// out-of-range ordinal OR a well-formed but unknown slug (the "s1" guess) throws rather
// than persisting a silent dangling edge; the result dedupes and a self-block throws.

const eq = (a: unknown, b: unknown) => JSON.stringify(a) === JSON.stringify(b);

// The resolver returns { ids, warnings } (warn-and-store). These normalization cases
// assert the resolved ids; a helper keeps them terse. Warn-and-store + planExists
// behavior lives in cross-plan-blocker-validation.test.ts.
const rIds = (...args: Parameters<typeof resolveBlockedByIds>) => resolveBlockedByIds(...args).ids;

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
    assert(eq(rIds(undefined, ids), []), 'undefined → []');
    assert(eq(rIds([], ids), []), 'empty → []');

    console.log('  • numeric ordinals → id at 1-based position');
    assert(eq(rIds(['1', '3'], ids), ['alpha', 'gamma']), 'numeric ordinals');

    console.log('  • JS-number ordinals (the bug) → resolve exactly like their string form');
    assert(eq(rIds([1, 3], ids), ['alpha', 'gamma']), 'number ordinals');
    assert(eq(rIds([2, 'gamma'], ids), ['beta', 'gamma']), 'number + slug mixed');
    assert(eq(rIds([1, 'alpha'], ids), ['alpha']), 'number/slug dedupe');
    expectThrows(() => rIds([4], ids), /ordinal "4"/, 'number too-high');

    console.log('  • "Step N" form — case-insensitive, whitespace-tolerant');
    assert(eq(rIds(['Step 2', 'step 3', ' 1 '], ids), ['beta', 'gamma', 'alpha']), 'Step N form');

    console.log('  • KNOWN slugs and plan ids pass through unchanged');
    assert(eq(rIds(['beta', 'pl_01ABC'], ids), ['beta', 'pl_01ABC']), 'passthrough');
    assert(eq(rIds(['demo-plan-001'], ids), ['demo-plan-001']), 'legacy plan-id passthrough');

    console.log('  • mixed ordinal + slug');
    assert(eq(rIds(['1', 'gamma'], ids), ['alpha', 'gamma']), 'mixed');

    console.log('  • out-of-range ordinal throws (too high, and zero)');
    expectThrows(() => rIds(['4'], ids), /ordinal "4"/, 'too-high');
    expectThrows(() => rIds(['0'], ids), /ordinal "0"/, 'zero');

    console.log('  • dedupe collapses an ordinal and the slug it resolves to');
    assert(eq(rIds(['1', 'alpha', '1'], ids), ['alpha']), 'dedupe');

    console.log('  • self-block rejected (via ordinal or slug)');
    expectThrows(() => rIds(['2'], ids, 'beta'), /itself/, 'self via ordinal');
    expectThrows(() => rIds(['beta'], ids, 'beta'), /itself/, 'self via slug');

    console.log('  • a well-formed non-ordinal that is not a known step id throws (no silent dangling edge)');
    expectThrows(() => rIds(['s1'], ids), /unknown step id "s1"/, 'unknown slug s1');
    expectThrows(() => rIds(['-1'], ids), /unknown step id "-1"/, 'signed non-ordinal is unknown, not passthrough');
    // the throw teaches the caller: it lists the valid ids and points at the ordinal form
    expectThrows(() => rIds(['s1'], ids), /Valid step ids: "alpha", "beta", "gamma"/, 'lists valid ids');
    expectThrows(() => rIds(['s1'], ids), /1-based ordinal/, 'suggests ordinal form');

    console.log('  • empty-string entry carries no edge — skipped, not thrown');
    assert(eq(rIds(['', 'alpha', '  '], ids), ['alpha']), 'empty skipped');

    console.log('  • malformed entries throw (never silently dropped)');
    expectThrows(() => rIds([1.5] as any, ids), /neither a step id/, 'float');
    expectThrows(() => rIds([NaN] as any, ids), /neither a step id/, 'NaN');
    expectThrows(() => rIds([null] as any, ids), /neither a step id/, 'null');
    expectThrows(() => rIds([{}] as any, ids), /neither a step id/, 'object');

    console.log('\n✅ resolveBlockedByIds tests passed\n');
}

run().catch(e => { console.error('❌', e); process.exit(1); });
