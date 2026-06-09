import { assert } from './test-utils.ts';
import { planReducer } from '../packages/core/dist/reducers/planReducer.js';

function makePlan(status: string, steps?: Array<{ order: number; description: string; status: string }>) {
    return {
        type: 'plan' as const,
        id: 'test-plan-001',
        title: 'Test Plan',
        status,
        created: '2026-04-23',
        version: 1,
        tags: [],
        parent_id: null,
        child_ids: [],
        requires_load: [],
        content: '',
        steps: steps ?? [
            { order: 1, description: 'Step one', status: 'pending', files_touched: [], blockedBy: [] },
            { order: 2, description: 'Step two', status: 'pending', files_touched: [], blockedBy: [] },
        ],
    } as any;
}

async function testPlanReducer() {
    console.log('🔁 Running planReducer tests...\n');

    // ── FINISH_PLAN ──────────────────────────────────────────────────────────
    console.log('  • FINISH_PLAN: implementing → done...');
    {
        const plan = makePlan('implementing');
        const result = planReducer(plan, { type: 'FINISH_PLAN' });
        assert(result.status === 'done', `Expected "done", got "${result.status}"`);
        assert(result.updated !== undefined, 'updated date must be set');
        console.log('    ✅ FINISH_PLAN transitions implementing → done');
    }

    console.log('  • FINISH_PLAN: invalid from draft throws...');
    {
        const plan = makePlan('draft');
        let threw = false;
        try { planReducer(plan, { type: 'FINISH_PLAN' }); } catch { threw = true; }
        assert(threw, 'FINISH_PLAN from draft must throw');
        console.log('    ✅ FINISH_PLAN from draft throws correctly');
    }

    // ── COMPLETE_STEP auto-done ──────────────────────────────────────────────
    console.log('  • COMPLETE_STEP: last step auto-transitions to done...');
    {
        const plan = makePlan('implementing', [
            { order: 1, description: 'Only step', status: 'pending', files_touched: [], blockedBy: [] },
        ]);
        const result = planReducer(plan, { type: 'COMPLETE_STEP', planId: 'test-plan-001', stepIndex: 0 } as any);
        assert(result.steps[0].status === 'done', 'step 0 must be marked done');
        assert(result.status === 'done', `Expected auto-done status "done", got "${result.status}"`);
        console.log('    ✅ COMPLETE_STEP auto-transitions to done when all steps complete');
    }

    console.log('  • COMPLETE_STEP: partial — status stays implementing...');
    {
        const plan = makePlan('implementing');
        const result = planReducer(plan, { type: 'COMPLETE_STEP', planId: 'test-plan-001', stepIndex: 0 } as any);
        assert(result.steps[0].status === 'done', 'step 0 must be done');
        assert(result.steps[1].status !== 'done', 'step 1 must still be pending');
        assert(result.status === 'implementing', `Expected "implementing", got "${result.status}"`);
        console.log('    ✅ COMPLETE_STEP partial leaves status as implementing');
    }

    console.log('  • COMPLETE_STEP: out-of-range index throws...');
    {
        const plan = makePlan('implementing');
        let threw = false;
        try { planReducer(plan, { type: 'COMPLETE_STEP', planId: 'test-plan-001', stepIndex: 99 } as any); } catch { threw = true; }
        assert(threw, 'out-of-range stepIndex must throw');
        console.log('    ✅ COMPLETE_STEP out-of-range throws correctly');
    }

    // ── Other invalid transitions ────────────────────────────────────────────
    console.log('  • ACTIVATE_PLAN: only from draft...');
    {
        const plan = makePlan('implementing');
        let threw = false;
        try { planReducer(plan, { type: 'ACTIVATE_PLAN' } as any); } catch { threw = true; }
        assert(threw, 'ACTIVATE_PLAN from implementing must throw');
        console.log('    ✅ ACTIVATE_PLAN from implementing throws correctly');
    }

    console.log('  • CANCEL_PLAN: cancels from active...');
    {
        const plan = makePlan('active');
        const result = planReducer(plan, { type: 'CANCEL_PLAN' } as any);
        assert(result.status === 'cancelled', `Expected "cancelled", got "${result.status}"`);
        console.log('    ✅ CANCEL_PLAN transitions active → cancelled');
    }

    console.log('  • BLOCK_PLAN / UNBLOCK_PLAN round-trip...');
    {
        const plan = makePlan('implementing');
        const blocked = planReducer(plan, { type: 'BLOCK_PLAN' } as any);
        assert(blocked.status === 'blocked', 'BLOCK_PLAN must set blocked');
        const unblocked = planReducer(blocked, { type: 'UNBLOCK_PLAN' } as any);
        assert(unblocked.status === 'active', 'UNBLOCK_PLAN must restore to active');
        console.log('    ✅ BLOCK_PLAN / UNBLOCK_PLAN round-trip correct');
    }

    console.log('\n✨ All planReducer tests passed!\n');
}

testPlanReducer().catch(err => {
    console.error('❌ plan-reducer.test.ts failed:', err.message);
    process.exit(1);
});
