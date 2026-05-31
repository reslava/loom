import { assert } from './test-utils.ts';
import { serializeFrontmatter, getThreadStatus, getWeaveStatus } from '../packages/core/dist/index.js';

async function testDoneDocEntity() {
    console.log('📄 Running DoneDoc entity tests...\n');

    const done = {
        type: 'done' as const,
        id: 'my-weave-plan-001-done',
        title: 'Done — My Plan',
        status: 'final' as const,
        created: '2026-04-23',
        version: 1,
        tags: [],
        parent_id: 'my-weave-plan-001',
        child_ids: [],
        requires_load: [],
        content: '## What was built\nTest.',
    };

    console.log('  • type is "done"...');
    assert(done.type === 'done', 'type must be "done"');
    console.log('    ✅ type: done');

    console.log('  • status is "final"...');
    assert(done.status === 'final', 'status must be "final"');
    console.log('    ✅ status: final');

    console.log('  • parent_id links to plan...');
    assert(done.parent_id === 'my-weave-plan-001', 'parent_id must link to the plan');
    console.log('    ✅ parent_id set correctly');

    console.log('  • serializeFrontmatter output...');
    const { content: _content, ...frontmatter } = done;
    const yaml = serializeFrontmatter(frontmatter);
    assert(yaml.includes('type: done'), 'serialized YAML must include type: done');
    assert(yaml.includes('status: final'), 'serialized YAML must include status: final');
    assert(yaml.includes('parent_id: my-weave-plan-001'), 'serialized YAML must include parent_id');
    assert(!yaml.includes('## What was built'), 'content body must not appear in frontmatter');
    console.log('    ✅ serializeFrontmatter correct');

    console.log('  • id convention: ends with -done...');
    assert(done.id.endsWith('-done'), 'done doc id must end with "-done"');
    console.log('    ✅ id convention correct');

    console.log('\n✨ All DoneDoc entity tests passed!\n');
}

function makePlan(id: string, status: string) {
    return {
        type: 'plan' as const,
        id,
        title: id,
        status: status as any,
        created: '2026-04-23',
        version: 1,
        design_version: 1,
        target_version: '0.3.0',
        tags: [],
        parent_id: null,
        child_ids: [],
        requires_load: [],
        steps: [],
        content: '',
    };
}

function makeThread(id: string, weaveId: string, plans: any[]) {
    return {
        id,
        weaveId,
        plans,
        dones: [],
        chats: [],
        allDocs: [...plans],
    };
}

async function testThreadEntity() {
    console.log('🧶 Running Thread entity tests...\n');

    // Thread shape
    const plan1 = makePlan('state-mgmt-plan-001', 'implementing');
    const plan2 = makePlan('state-mgmt-plan-002', 'draft');
    const thread = makeThread('state-management', 'core-engine', [plan1, plan2]);

    console.log('  • thread has id and weaveId...');
    assert(thread.id === 'state-management', 'thread id must be set');
    assert(thread.weaveId === 'core-engine', 'thread weaveId must be set');
    console.log('    ✅ id and weaveId correct');

    console.log('  • thread has plans...');
    assert(thread.plans.length === 2, 'thread must have 2 plans');
    console.log('    ✅ plans length: 2');

    // getThreadStatus — implementing wins
    console.log('  • getThreadStatus — implementing wins...');
    const status1 = getThreadStatus(thread);
    assert(status1 === 'IMPLEMENTING', `expected IMPLEMENTING, got ${status1}`);
    console.log('    ✅ IMPLEMENTING');

    // getThreadStatus — all draft → ACTIVE
    console.log('  • getThreadStatus — all draft → ACTIVE...');
    const draftThread = makeThread('event-bus', 'core-engine', [makePlan('eb-plan-001', 'draft')]);
    const status2 = getThreadStatus(draftThread);
    assert(status2 === 'ACTIVE', `expected ACTIVE, got ${status2}`);
    console.log('    ✅ ACTIVE');

    // getThreadStatus — empty plans → ACTIVE (fallback)
    console.log('  • getThreadStatus — no plans → ACTIVE (fallback)...');
    const emptyThread = makeThread('empty', 'core-engine', []);
    const status3 = getThreadStatus(emptyThread);
    assert(status3 === 'ACTIVE', `expected ACTIVE (fallback), got ${status3}`);
    console.log('    ✅ ACTIVE (fallback)');

    console.log('\n✨ All Thread entity tests passed!\n');
}

function makeCtx(id: string) {
    return {
        type: 'ctx' as const,
        id,
        title: id,
        status: 'active' as const,
        created: '2026-04-23',
        version: 1,
        tags: [],
        parent_id: null,
        child_ids: [],
        requires_load: [],
        content: '',
    };
}

async function testStatusExcludesCtxAndReference() {
    console.log('🧷 Running status ctx/reference exclusion tests...\n');

    const donePlan = makePlan('ctx-load-plan-001', 'done');
    const ctx = makeCtx('core-engine-ctx');

    // Thread: a done plan + a perpetual ctx → still DONE (ctx excluded from every-done)
    const thread = {
        id: 'ctx-load', weaveId: 'core-engine',
        plans: [donePlan], dones: [], chats: [],
        allDocs: [donePlan, ctx],
    };
    console.log('  • getThreadStatus — done plan + active ctx → DONE...');
    const ts = getThreadStatus(thread as any);
    assert(ts === 'DONE', `expected DONE, got ${ts}`);
    console.log('    ✅ DONE');

    // Weave: a done plan + a ctx loose fiber → still DONE
    const weave = {
        id: 'core-engine', threads: [thread], looseFibers: [ctx], chats: [],
        allDocs: [donePlan, ctx],
    };
    console.log('  • getWeaveStatus — done plan + active ctx → DONE...');
    const ws = getWeaveStatus(weave as any);
    assert(ws === 'DONE', `expected DONE, got ${ws}`);
    console.log('    ✅ DONE');

    // Guard: only a ctx, no deliverables → NOT a false DONE
    const ctxOnly = {
        id: 'x', weaveId: 'core-engine',
        plans: [], dones: [], chats: [],
        allDocs: [ctx],
    };
    console.log('  • getThreadStatus — only ctx, no deliverables → not DONE...');
    const ts2 = getThreadStatus(ctxOnly as any);
    assert(ts2 === 'ACTIVE', `expected ACTIVE, got ${ts2}`);
    console.log('    ✅ ACTIVE (no false DONE)');

    console.log('\n✨ All status ctx/reference exclusion tests passed!\n');
}

async function testWeaveWithThreads() {
    console.log('🧵 Running Weave-with-threads aggregation tests...\n');

    const thread1 = makeThread('state-management', 'core-engine', [
        makePlan('sm-plan-001', 'implementing'),
    ]);
    const thread2 = makeThread('event-bus', 'core-engine', [
        makePlan('eb-plan-001', 'draft'),
    ]);

    const weave = {
        id: 'core-engine',
        threads: [thread1, thread2],
        looseFibers: [],
        chats: [],
        allDocs: [...thread1.allDocs, ...thread2.allDocs],
    };

    // getWeaveStatus — implementing in thread1 wins
    console.log('  • getWeaveStatus — implementing in any thread wins...');
    const status = getWeaveStatus(weave);
    assert(status === 'IMPLEMENTING', `expected IMPLEMENTING, got ${status}`);
    console.log('    ✅ IMPLEMENTING');

    // Two threads: verify both plans counted
    console.log('  • allDocs aggregates across threads...');
    assert(weave.allDocs.length === 2, `expected 2 allDocs, got ${weave.allDocs.length}`);
    console.log('    ✅ allDocs length: 2');

    console.log('\n✨ All Weave-with-threads tests passed!\n');
}

Promise.all([
    testDoneDocEntity(),
    testThreadEntity(),
    testWeaveWithThreads(),
    testStatusExcludesCtxAndReference(),
]).catch(err => {
    console.error('❌ entity.test.ts failed:', err.message);
    process.exit(1);
});
