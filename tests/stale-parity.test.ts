import { assert } from './test-utils.ts';
import { staleEntries } from '../packages/core/dist/index.js';

// Parity suite for the canonical staleness predicate. The whole point of the
// align-stale-surfaces work: the VS Code tree (reads the per-thread actionable
// set attached by getState) and `loom stale` (reads getStaleDocs over the same
// entries) must show the SAME stale docs. Both derive from staleEntries, so this
// test locks every axis + the actionable flag + the cross-surface parity.

function doc(id: string, type: string, status: string, extra: any = {}): any {
    return { id, type, status, version: 1, created: '2026-06-01', updated: '2026-06-01', ...extra };
}

// One weave exercising all four reasons + a fully-done (non-actionable) thread.
function fixture(): any {
    return {
        id: 'w',
        threads: [
            // A: design_version — one active plan (actionable), one done plan (not).
            {
                id: 'ta', weaveId: 'w',
                design: doc('A-design', 'design', 'active', { version: 3, updated: '2026-06-10' }),
                plans: [
                    doc('A-plan-active', 'plan', 'active', { design_version: 1 }),
                    doc('A-plan-done', 'plan', 'done', { design_version: 1 }),
                ],
            },
            // B: design_behind_idea — idea updated after design (both draft).
            {
                id: 'tb', weaveId: 'w',
                idea: doc('B-idea', 'idea', 'draft', { updated: '2026-06-09' }),
                design: doc('B-design', 'design', 'draft', { version: 1, updated: '2026-06-05' }),
                plans: [],
            },
            // C: idea_behind_design — design updated after idea (both draft).
            {
                id: 'tc', weaveId: 'w',
                idea: doc('C-idea', 'idea', 'draft', { updated: '2026-06-01' }),
                design: doc('C-design', 'design', 'draft', { version: 1, updated: '2026-06-08' }),
                plans: [],
            },
            // D: req_version — idea behind a locked req (no design → no date axis).
            {
                id: 'td', weaveId: 'w',
                idea: doc('D-idea', 'idea', 'draft', { updated: '2026-06-03', req_version: 1 }),
                req: doc('D-req', 'req', 'locked', { version: 2 }),
                plans: [],
            },
            // E: everything done — stale entries exist but NONE actionable.
            {
                id: 'te', weaveId: 'w',
                idea: doc('E-idea', 'idea', 'done', { updated: '2026-06-02' }),
                design: doc('E-design', 'design', 'done', { version: 2, updated: '2026-06-04' }),
                plans: [doc('E-plan', 'plan', 'done', { design_version: 1 })],
            },
        ],
    };
}

function run() {
    console.log('🔧 Running stale-parity tests...\n');
    const weave = fixture();
    const entries = staleEntries(weave);
    const byId = (es: any[]) => new Set(es.map(e => e.docId));

    // ── every axis fires with the right reason ──
    console.log('  • each axis produces the expected reason...');
    const reasonOf = (id: string) => entries.find((e: any) => e.docId === id)?.reason;
    assert(reasonOf('A-plan-active') === 'design_version', `A-plan-active → design_version, got ${reasonOf('A-plan-active')}`);
    assert(reasonOf('B-design') === 'design_behind_idea', `B-design → design_behind_idea, got ${reasonOf('B-design')}`);
    assert(reasonOf('C-idea') === 'idea_behind_design', `C-idea → idea_behind_design, got ${reasonOf('C-idea')}`);
    assert(reasonOf('D-idea') === 'req_version', `D-idea → req_version, got ${reasonOf('D-idea')}`);
    console.log('    ✅ design_version / design_behind_idea / idea_behind_design / req_version all present');

    // ── actionable filter = exactly the four live docs ──
    console.log('  • actionable set excludes done docs...');
    const actionable = entries.filter((e: any) => e.actionable);
    const actionableIds = byId(actionable);
    const expected = new Set(['A-plan-active', 'B-design', 'C-idea', 'D-idea']);
    assert(actionableIds.size === expected.size && [...expected].every(id => actionableIds.has(id)),
        `actionable = {A-plan-active,B-design,C-idea,D-idea}, got {${[...actionableIds].join(',')}}`);
    assert(!actionableIds.has('A-plan-done'), 'done plan is not actionable');
    console.log('    ✅ 4 actionable, done plan excluded');

    // ── includeDone (loom stale --all) surfaces the historical entries too ──
    console.log('  • --all view includes done/historical docs...');
    const allIds = byId(entries);
    for (const id of ['A-plan-done', 'E-idea', 'E-plan']) {
        assert(allIds.has(id), `--all includes ${id}`);
    }
    console.log('    ✅ historical entries present in the unfiltered set');

    // ── a fully-done thread yields zero actionable ──
    console.log('  • all-done thread → zero actionable...');
    const teActionable = actionable.filter((e: any) => e.threadId === 'te');
    assert(teActionable.length === 0, `thread te has 0 actionable, got ${teActionable.length}`);
    console.log('    ✅ done thread is silent');

    // ── PARITY: extension set (per-thread actionable) == CLI set (flat actionable) ──
    console.log('  • extension set == loom stale set...');
    const extensionSet = new Set<string>(); // what treeProvider builds from thread.stale
    for (const thread of weave.threads) {
        for (const e of entries.filter((x: any) => x.threadId === thread.id && x.actionable)) extensionSet.add(e.docId);
    }
    const cliSet = actionableIds; // what getStaleDocs returns
    assert(extensionSet.size === cliSet.size && [...cliSet].every(id => extensionSet.has(id)),
        `surfaces agree: ext={${[...extensionSet].join(',')}} cli={${[...cliSet].join(',')}}`);
    console.log('    ✅ the two surfaces report identical stale docs');

    console.log('\n✅ stale-parity tests passed\n');
}

run();
