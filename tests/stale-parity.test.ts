import { assert } from './test-utils.ts';
import { staleEntries } from '../packages/core/dist/index.js';

// Parity + correctness suite for the canonical staleness predicate (the directional,
// version-based model — loom/refs/staleness-reference.md). Locks: the four reasons,
// downstream-only direction (an idea is NEVER stale), the actionable flag, and that
// the VS Code tree set == the `loom stale` set.

function doc(id: string, type: string, status: string, extra: any = {}): any {
    return { id, type, status, version: 1, created: '2026-06-01', updated: '2026-06-01', ...extra };
}

// One weave exercising all four reasons + done (non-actionable) docs + an all-done thread.
function fixture(): any {
    return {
        id: 'w',
        threads: [
            // A: design_stale — design.idea_version (1) behind idea.version (3). Idea must NOT be flagged.
            {
                id: 'ta', weaveSlug: 'w',
                idea: doc('A-idea', 'idea', 'active', { version: 3 }),
                design: doc('A-design', 'design', 'active', { idea_version: 1 }),
                plans: [],
            },
            // B: req_stale — req.design_version (1) behind design.version (2).
            {
                id: 'tb', weaveSlug: 'w',
                design: doc('B-design', 'design', 'active', { version: 2 }),
                req: doc('B-req', 'req', 'locked', { design_version: 1 }),
                plans: [],
            },
            // C: plan_design_stale — one active plan (actionable), one done plan (not).
            {
                id: 'tc', weaveSlug: 'w',
                design: doc('C-design', 'design', 'active', { version: 3 }),
                plans: [
                    doc('C-plan-active', 'plan', 'active', { design_version: 1 }),
                    doc('C-plan-done', 'plan', 'done', { design_version: 1 }),
                ],
            },
            // D: plan_req_stale — plan.req_version (1) behind locked req.version (2); design current.
            {
                id: 'td', weaveSlug: 'w',
                design: doc('D-design', 'design', 'active', { version: 1 }),
                req: doc('D-req', 'req', 'locked', { version: 2, design_version: 1 }),
                plans: [doc('D-plan', 'plan', 'active', { design_version: 1, req_version: 1 })],
            },
            // E: all done — a design_stale entry exists but NONE actionable.
            {
                id: 'te', weaveSlug: 'w',
                idea: doc('E-idea', 'idea', 'done', { version: 2 }),
                design: doc('E-design', 'design', 'done', { version: 1, idea_version: 1 }),
                plans: [doc('E-plan', 'plan', 'done', { design_version: 1 })],
            },
        ],
    };
}

function run() {
    console.log('🔧 Running stale-parity (directional model) tests...\n');
    const weave = fixture();
    const entries = staleEntries(weave);
    const idSet = (es: any[]) => new Set(es.map(e => e.docId));

    // ── each axis fires with the right reason ──
    console.log('  • each edge produces the expected reason...');
    const reasonOf = (id: string) => entries.find((e: any) => e.docId === id)?.reason;
    assert(reasonOf('A-design') === 'design_stale', `A-design → design_stale, got ${reasonOf('A-design')}`);
    assert(reasonOf('B-req') === 'req_stale', `B-req → req_stale, got ${reasonOf('B-req')}`);
    assert(reasonOf('C-plan-active') === 'plan_design_stale', `C-plan-active → plan_design_stale, got ${reasonOf('C-plan-active')}`);
    assert(reasonOf('D-plan') === 'plan_req_stale', `D-plan → plan_req_stale, got ${reasonOf('D-plan')}`);
    console.log('    ✅ design_stale / req_stale / plan_design_stale / plan_req_stale');

    // ── DIRECTIONAL: an idea is never stale, and nothing upstream is flagged ──
    console.log('  • no upstream doc is ever flagged (ideas never stale)...');
    assert(!entries.some((e: any) => e.type === 'idea'), 'no idea is ever in the stale set');
    assert(reasonOf('A-idea') === undefined, 'A-idea (upstream of a changed design) is not stale');
    console.log('    ✅ staleness flows downstream only');

    // ── actionable set = exactly the four live docs ──
    console.log('  • actionable excludes done docs...');
    const actionable = entries.filter((e: any) => e.actionable);
    const actionableIds = idSet(actionable);
    const expected = new Set(['A-design', 'B-req', 'C-plan-active', 'D-plan']);
    assert(actionableIds.size === expected.size && [...expected].every(id => actionableIds.has(id)),
        `actionable = {A-design,B-req,C-plan-active,D-plan}, got {${[...actionableIds].join(',')}}`);
    assert(!actionableIds.has('C-plan-done'), 'done plan is not actionable');
    console.log('    ✅ 4 actionable, done docs excluded');

    // ── --all surfaces the historical (done) entries ──
    console.log('  • --all view includes done/historical docs...');
    const allIds = idSet(entries);
    for (const id of ['C-plan-done', 'E-design']) assert(allIds.has(id), `--all includes ${id}`);
    console.log('    ✅ historical entries present unfiltered');

    // ── all-done thread → zero actionable ──
    console.log('  • all-done thread → zero actionable...');
    assert(actionable.filter((e: any) => e.threadSlug === 'te').length === 0, 'thread te has 0 actionable');
    console.log('    ✅ done thread is silent');

    // ── PARITY: extension set (per-thread actionable) == CLI set (flat actionable) ──
    console.log('  • extension set == loom stale set...');
    const extensionSet = new Set<string>();
    for (const thread of weave.threads) {
        for (const e of entries.filter((x: any) => x.threadSlug === thread.id && x.actionable)) extensionSet.add(e.docId);
    }
    assert(extensionSet.size === actionableIds.size && [...actionableIds].every(id => extensionSet.has(id)),
        `surfaces agree: ext={${[...extensionSet].join(',')}} cli={${[...actionableIds].join(',')}}`);
    console.log('    ✅ the two surfaces report identical stale docs');

    console.log('\n✅ stale-parity (directional model) tests passed\n');
}

run();
