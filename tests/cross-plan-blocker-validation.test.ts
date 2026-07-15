import { assert } from './test-utils.ts';
import {
    resolveBlockedByIds,
    validateStepBlockers,
    isStepBlocked,
    createEmptyIndex,
} from '../packages/core/dist/index.js';

// core-engine/cross-plan-blocker-validation — warn-and-store for cross-plan blockers.
//
// A `blockedBy` naming a non-existent plan is STORED (never rejected — forward-referencing
// a not-yet-created plan is legal), and surfaced: the resolver returns a non-blocking
// warning when handed a planExists predicate, and the standing validateStepBlockers /
// loom://diagnostics net flags it from persisted state. isStepBlocked's "missing plan ⇒
// blocked" is demoted to a back-compat fallback and unified across the pl_ / legacy forms.

const eq = (a: unknown, b: unknown) => JSON.stringify(a) === JSON.stringify(b);

function expectThrows(fn: () => void, re: RegExp, label: string): void {
    let threw = false;
    try { fn(); } catch (e) {
        threw = true;
        assert(re.test((e as Error).message), `${label}: message did not match ${re}`);
    }
    assert(threw, `${label}: expected a throw, got none`);
}

/** A minimal DocumentEntry for an existing plan in the index. */
function planEntry() {
    return { path: 'x.md', type: 'plan' as const, exists: true, archived: false };
}

/** A minimal PlanStep for the validators (only id/order/status/blockedBy are read). */
function step(id: string, order: number, blockedBy: string[]) {
    return { id, order, status: 'pending' as const, title: id, description: id, files_touched: [], blockedBy, satisfies: [] };
}

async function run() {
    console.log('🔗 Running cross-plan-blocker-validation tests...\n');
    const ids = ['alpha', 'beta'];

    // ---- Resolver: warn-and-store via the injected planExists predicate ----
    console.log('  • unresolved pl_ WITH predicate → stored AND a dangling_plan_ref warning');
    const r1 = resolveBlockedByIds(['pl_MISSING'], ids, undefined, () => false);
    assert(eq(r1.ids, ['pl_MISSING']), 'unresolved pl_ is still stored (warn-and-store)');
    assert(r1.warnings.length === 1, 'exactly one warning');
    assert(r1.warnings[0].kind === 'dangling_plan_ref' && r1.warnings[0].ref === 'pl_MISSING', 'warning shape');

    console.log('  • resolved pl_ WITH predicate → stored, no warning');
    const r2 = resolveBlockedByIds(['pl_REAL'], ids, undefined, (ref) => ref === 'pl_REAL');
    assert(eq(r2.ids, ['pl_REAL']) && r2.warnings.length === 0, 'existing plan → no warning');

    console.log('  • no predicate → best-effort passthrough, no warning (pure-core / reducer path)');
    const r3 = resolveBlockedByIds(['pl_MISSING'], ids);
    assert(eq(r3.ids, ['pl_MISSING']) && r3.warnings.length === 0, 'no predicate → stored, silent');

    console.log('  • warning carries the owning step id (selfId)');
    const r4 = resolveBlockedByIds(['pl_X'], ids, 'alpha', () => false);
    assert(r4.warnings[0].stepId === 'alpha', 'warning.stepId === selfId');

    console.log('  • a repeated dangling ref dedupes to one edge AND one warning');
    const r5 = resolveBlockedByIds(['pl_X', 'pl_X'], ids, undefined, () => false);
    assert(r5.ids.length === 1 && r5.warnings.length === 1, 'dedupe collapses ref + warning');

    console.log('  • unknown STEP slug still hard-throws, even with a predicate (guard intact)');
    expectThrows(() => resolveBlockedByIds(['s1'], ids, undefined, () => true), /unknown step id "s1"/, 'unknown step throws');

    // ---- Standing net: validateStepBlockers flags dangling cross-plan blockers ----
    console.log('  • validateStepBlockers: missing pl_ / legacy → warning; existing → clean; valid pl_ not mis-flagged');
    const index = createEmptyIndex();
    index.documents.set('pl_REAL', planEntry());
    const plan = {
        id: 'pl_SELF',
        steps: [
            step('s-a', 1, []),
            step('s-b', 2, ['pl_MISSING']),      // modern ULID, missing → warn
            step('s-c', 3, ['pl_REAL']),         // modern ULID, exists → clean (was mis-flagged before)
            step('s-d', 4, ['demo-plan-001']),   // legacy form, missing → warn
        ],
    } as any;
    const issues = validateStepBlockers(plan, index);
    assert(issues.length === 2, `expected 2 dangling warnings, got ${issues.length}: ${issues.map(i => i.message).join(' | ')}`);
    assert(issues.some(i => /missing plan "pl_MISSING"/.test(i.message)), 'flags missing pl_ ULID');
    assert(issues.some(i => /missing plan "demo-plan-001"/.test(i.message)), 'flags missing legacy plan id');
    assert(!issues.some(i => /unknown blocker format/.test(i.message)), 'a valid pl_ is NOT reported as unknown format');
    assert(issues.every(i => i.severity === 'warning'), 'dangling cross-plan is a warning, not an error');

    // ---- isStepBlocked: demoted fallback, unified across pl_ / legacy forms ----
    console.log('  • isStepBlocked: missing plan ⇒ blocked (back-compat); existing ⇒ not blocked; both forms');
    const idx = createEmptyIndex();
    idx.documents.set('pl_REAL', planEntry());
    const owner = { id: 'p', steps: [] } as any;
    assert(isStepBlocked({ order: 1, blockedBy: ['pl_GONE'] }, owner, idx) === true, 'missing pl_ ULID ⇒ blocked (was silently ignored before)');
    assert(isStepBlocked({ order: 1, blockedBy: ['demo-plan-999'] }, owner, idx) === true, 'missing legacy plan id ⇒ blocked');
    assert(isStepBlocked({ order: 1, blockedBy: ['pl_REAL'] }, owner, idx) === false, 'existing plan ⇒ not blocked (best-effort)');
    assert(isStepBlocked({ order: 1, blockedBy: [] }, owner, idx) === false, 'no blockers ⇒ not blocked');

    console.log('\n✅ cross-plan-blocker-validation tests passed\n');
}

run().catch(e => { console.error('❌', e); process.exit(1); });
