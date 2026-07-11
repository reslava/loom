import { assert } from './test-utils.ts';
import { decideSetStatus } from '../packages/core/dist/index.js';

// The single guarded status verb. decideSetStatus is a pure lookup: free label
// transitions are allowed, the three guarded transitions delegate to their owning
// tool (a plan is never *set* done — it's earned via loom_close_plan), and a status
// invalid for the doc type is rejected.

function run() {
    console.log('🔧 Running set-status decision tests...\n');

    // ── free label transitions: allowed ──
    console.log('  • free label transitions are allowed...');
    const allowed: Array<[string, string]> = [
        ['idea', 'active'], ['idea', 'done'], ['idea', 'draft'],
        ['design', 'active'], ['design', 'done'],
        ['plan', 'active'], ['plan', 'draft'],
        ['reference', 'active'],
        // chat has a terminal `done` label (restored — a chat could always be marked
        // done before; the regression dropped it from the valid set). active/archived too.
        ['chat', 'active'], ['chat', 'done'], ['chat', 'archived'],
    ];
    for (const [type, status] of allowed) {
        const d = decideSetStatus(type, status);
        assert(d.kind === 'allow', `${type}->${status} should be allowed, got ${d.kind}`);
    }
    console.log('    ✅ idea/design/plan/reference free labels allowed');

    // ── guarded transitions: delegated to the owning tool ──
    console.log('  • guarded transitions delegate to the owning tool...');
    const planDone = decideSetStatus('plan', 'done');
    assert(planDone.kind === 'delegate' && (planDone as any).tool === 'loom_close_plan',
        `plan->done should delegate to loom_close_plan, got ${JSON.stringify(planDone)}`);
    const planImpl = decideSetStatus('plan', 'implementing');
    assert(planImpl.kind === 'delegate' && (planImpl as any).tool === 'loom_start_plan',
        `plan->implementing should delegate to loom_start_plan, got ${JSON.stringify(planImpl)}`);
    const reqLocked = decideSetStatus('req', 'locked');
    assert(reqLocked.kind === 'delegate' && (reqLocked as any).tool === 'loom_finalize_req',
        `req->locked should delegate to loom_finalize_req, got ${JSON.stringify(reqLocked)}`);
    console.log('    ✅ plan->done/implementing + req->locked delegate correctly');

    // ── invalid statuses: rejected ──
    console.log('  • invalid statuses are rejected...');
    assert(decideSetStatus('idea', 'bogus').kind === 'reject', 'an invalid idea status is rejected');
    assert(decideSetStatus('reference', 'done').kind === 'reject', 'a reference has no "done" status');
    assert(decideSetStatus('nonsense', 'active').kind === 'reject', 'an unknown doc type is rejected');
    console.log('    ✅ invalid status + unknown type rejected');

    console.log('\n✅ set-status decision tests passed\n');
}

try {
    run();
} catch (e: any) {
    console.error('❌', e.message);
    process.exit(1);
}
