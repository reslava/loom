import * as path from 'path';
import * as fs from 'fs-extra';
import * as os from 'os';
import { assert } from './test-utils.ts';
import { planReducer } from '../packages/core/dist/reducers/planReducer.js';
import { rekeyDetailSections } from '../packages/core/dist/index.js';
import { loadWeave, saveDocs, loadDoc, saveDoc } from '../packages/fs/dist/index.js';
import { weavePlan } from '../packages/app/dist/weavePlan.js';
import { createThread } from '../packages/app/dist/thread.js';
import { runEvent } from '../packages/app/dist/runEvent.js';
import { addStep } from '../packages/app/dist/addStep.js';
import { removeStep } from '../packages/app/dist/removeStep.js';
import { reorderSteps } from '../packages/app/dist/reorderSteps.js';

const TMP = path.join(os.tmpdir(), 'loom-step-crud-tests');

function makePlan(
    status: string,
    steps: Array<{ id: string; order: number; description: string; status: string; blockedBy?: string[]; detail?: string }>,
) {
    return {
        type: 'plan' as const, id: 'test-plan-001', title: 'Test Plan', status,
        created: '2026-06-11', version: 1, tags: [], parent_id: null, child_ids: [],
        requires_load: [], content: '', design_version: 1, target_version: '0.1.0',
        steps: steps.map(s => ({
            files_touched: [], satisfies: [], title: s.description,
            blockedBy: s.blockedBy ?? [], ...s,
        })),
    } as any;
}

async function expectThrow(fn: () => any, label: string): Promise<void> {
    let threw = false;
    try { await fn(); } catch { threw = true; }
    assert(threw, `expected throw: ${label}`);
}

/** Marker ids in document order. */
function detailOrder(body: string): string[] {
    return body.split('\n')
        .map(l => l.match(/^<!--\s*step:(.+?)\s*-->$/))
        .filter((m): m is RegExpMatchArray => !!m)
        .map(m => m[1]);
}

/** The prose under a given step id's detail section (until the next marker/heading/EOF). */
function proseFor(body: string, id: string): string | null {
    const lines = body.split('\n');
    const mi = lines.findIndex(l => new RegExp(`^<!--\\s*step:${id}\\s*-->$`).test(l));
    if (mi === -1) return null;
    // skip the marker line and the heading line that follows it
    let i = mi + 1;
    if (i < lines.length && /^### /.test(lines[i])) i++;
    const out: string[] = [];
    for (; i < lines.length; i++) {
        if (/^<!--\s*step:.+?-->$/.test(lines[i]) || /^### /.test(lines[i])) break;
        out.push(lines[i]);
    }
    return out.join('\n').trim();
}

async function run() {
    console.log('🔁 Running step-crud tests...\n');

    // ── A. planReducer ADD_STEP (pure) ──
    console.log('  • ADD_STEP append/before/after, order recompute, slug id, guards...');
    {
        const base = () => makePlan('implementing', [
            { id: 'a', order: 1, description: 'A', status: 'pending' },
            { id: 'b', order: 2, description: 'B', status: 'pending' },
        ]);

        const appended = planReducer(base(), { type: 'ADD_STEP', step: { description: 'New C step', detail: 'c prose' } } as any);
        assert(appended.steps.map((s: any) => s.id).join(',') === 'a,b,new-c-step', 'append → new step last with slug id');
        assert(appended.steps[2].order === 3, 'append → order recomputed');
        assert(appended.steps[2].detail === 'c prose', 'append → transient detail carried on the new step');
        assert(appended.steps[2].status === 'pending', 'new step is pending');

        const before = planReducer(base(), { type: 'ADD_STEP', step: { description: 'mid' }, position: { before: 'b' } } as any);
        assert(before.steps.map((s: any) => s.id).join(',') === 'a,mid,b', 'before → inserted ahead of ref');
        assert(before.steps.every((s: any, i: number) => s.order === i + 1), 'before → order 1..n');

        const after = planReducer(base(), { type: 'ADD_STEP', step: { description: 'after a step' }, position: { after: 'a' } } as any);
        assert(after.steps.map((s: any) => s.id).join(',') === 'a,after-a-step,b', 'after → inserted behind ref');

        // slug collision gets a numeric suffix
        const collide = planReducer(makePlan('implementing', [{ id: 'a', order: 1, description: 'A', status: 'pending' }]),
            { type: 'ADD_STEP', step: { description: 'a' } } as any);
        assert(collide.steps.map((s: any) => s.id).join(',') === 'a,a-2', 'slug collision → suffixed id');

        // guards
        await expectThrow(() => planReducer(base(), { type: 'ADD_STEP', step: { description: '  ' } } as any), 'empty description');
        await expectThrow(() => planReducer(base(), { type: 'ADD_STEP', step: { description: 'x' }, position: { after: 'nope' } } as any), 'unknown position ref');
        await expectThrow(() => planReducer(makePlan('done', [{ id: 'a', order: 1, description: 'A', status: 'done' }]),
            { type: 'ADD_STEP', step: { description: 'x' } } as any), 'add on a done plan');
        // cannot insert before the leading done/cancelled block
        const withDone = makePlan('implementing', [
            { id: 'd', order: 1, description: 'D', status: 'done' },
            { id: 'b', order: 2, description: 'B', status: 'pending' },
        ]);
        await expectThrow(() => planReducer(withDone, { type: 'ADD_STEP', step: { description: 'x' }, position: { before: 'd' } } as any), 'insert before leading done block');
        const okPastDone = planReducer(withDone, { type: 'ADD_STEP', step: { description: 'x' } } as any);
        assert(okPastDone.steps.map((s: any) => `${s.id}:${s.status}`).join(',') === 'd:done,b:pending,x:pending', 'append past leading done block ok');
        console.log('    ✅ ADD_STEP positions, order, slug, leading-block + status guards');
    }

    // ── B. planReducer REMOVE_STEP (pure) ──
    console.log('  • REMOVE_STEP removes, recomputes order, strips blockedBy refs; rejects done/unknown...');
    {
        const plan = makePlan('implementing', [
            { id: 'a', order: 1, description: 'A', status: 'pending' },
            { id: 'b', order: 2, description: 'B', status: 'pending' },
            { id: 'c', order: 3, description: 'C', status: 'pending', blockedBy: ['b'] },
        ]);
        const r = planReducer(plan, { type: 'REMOVE_STEP', stepId: 'b' } as any);
        assert(r.steps.map((s: any) => s.id).join(',') === 'a,c', 'b removed');
        assert(r.steps[1].order === 2, 'order recomputed after removal');
        assert(JSON.stringify(r.steps[1].blockedBy) === '[]', 'blockedBy ref to removed step stripped');

        await expectThrow(() => planReducer(makePlan('implementing', [{ id: 'a', order: 1, description: 'A', status: 'done' }]),
            { type: 'REMOVE_STEP', stepId: 'a' } as any), 'remove done step');
        await expectThrow(() => planReducer(makePlan('implementing', [{ id: 'a', order: 1, description: 'A', status: 'cancelled' }]),
            { type: 'REMOVE_STEP', stepId: 'a' } as any), 'remove cancelled step');
        await expectThrow(() => planReducer(plan, { type: 'REMOVE_STEP', stepId: 'zzz' } as any), 'remove unknown step');
        console.log('    ✅ REMOVE_STEP recompute + strip + done/cancelled/unknown guards');
    }

    // ── B2. planReducer UPDATE_STEP: citation-only amend on a done step / done plan ──
    console.log('  • UPDATE_STEP: satisfies-only amends a done step/plan; other edits + cancelled rejected...');
    {
        const donePlan = makePlan('done', [{ id: 'a', order: 1, description: 'A', status: 'done' }]);

        // citation-only patch on a done step of a DONE plan → allowed (both guards relaxed)
        const cited = planReducer(donePlan, { type: 'UPDATE_STEP', stepId: 'a', patch: { satisfies: ['IN1'] } } as any);
        assert(JSON.stringify(cited.steps[0].satisfies) === '["IN1"]', 'satisfies amended on a done step of a done plan');
        assert(cited.steps[0].status === 'done', 'the step stays done');
        assert(cited.status === 'done', 'the plan stays done');

        // a non-citation patch (description) on a done step → still rejected
        await expectThrow(() => planReducer(donePlan, { type: 'UPDATE_STEP', stepId: 'a', patch: { description: 'rewrite' } } as any), 'description edit on a done step');
        // a mixed patch (satisfies + files) is NOT citation-only → rejected on a done step
        await expectThrow(() => planReducer(donePlan, { type: 'UPDATE_STEP', stepId: 'a', patch: { satisfies: ['IN2'], files_touched: ['x.ts'] } } as any), 'mixed satisfies+files patch on a done step');
        // citation on a cancelled step → rejected (cancelled work satisfies nothing)
        await expectThrow(() => planReducer(makePlan('implementing', [{ id: 'c', order: 1, description: 'C', status: 'cancelled' }]),
            { type: 'UPDATE_STEP', stepId: 'c', patch: { satisfies: ['IN1'] } } as any), 'cite a cancelled step');
        // sanity: satisfies on a pending step still works as before
        const okPending = planReducer(makePlan('implementing', [{ id: 'p', order: 1, description: 'P', status: 'pending' }]),
            { type: 'UPDATE_STEP', stepId: 'p', patch: { satisfies: ['IN9'] } } as any);
        assert(JSON.stringify(okPending.steps[0].satisfies) === '["IN9"]', 'satisfies on a pending step unchanged');
        console.log('    ✅ citation-only amends a done step/plan; description/mixed/cancelled rejected');
    }

    // ── C. rekeyDetailSections (pure) — the Option-A invariant ──
    console.log('  • rekeyDetailSections: backfill, reorder-reflow, add-stub, remove-prune, idempotent...');
    {
        const mk = (id: string, order: number, opts: any = {}) =>
            ({ id, order, status: 'pending', title: id, description: id, files_touched: [], blockedBy: [], satisfies: [], ...opts });

        // a marker-less legacy body (the 1.4.0 shape) with detail in order a,b,c
        const legacy = [
            '## Goal', '', 'g', '', '---', '', '## Steps', '', '| Done |', '|---|', '', '---', '',
            '### Legend', '', '| Symbol |', '|---|', '',
            '### Step 1 — Alpha', '', 'alpha prose', '',
            '### Step 2 — Beta', '', 'beta prose', '',
            '### Step 3 — Gamma', '', 'gamma prose', '',
        ].join('\n');

        const stepsAbc = [mk('a', 1), mk('b', 2), mk('c', 3)];
        const marked = rekeyDetailSections(legacy, stepsAbc);
        assert(detailOrder(marked).join(',') === 'a,b,c', 'backfill maps marker-less sections to ids by order');
        assert(proseFor(marked, 'a') === 'alpha prose' && proseFor(marked, 'c') === 'gamma prose', 'backfill preserves prose');

        // REORDER reflow: steps now c,a,b → detail must follow the id, not the position
        const reordered = rekeyDetailSections(marked, [mk('c', 1), mk('a', 2), mk('b', 3)]);
        assert(detailOrder(reordered).join(',') === 'c,a,b', 'reorder reflows detail sections by id (the reorder_steps regression)');
        assert(proseFor(reordered, 'c') === 'gamma prose', 'reorder keeps prose attached to its id');
        assert(/<!--\s*step:c\s*-->\n### Step 1 /.test(reordered), 'Step number re-rendered from new order');

        // ADD stub: a new step d carrying transient detail
        const added = rekeyDetailSections(reordered, [mk('c', 1), mk('a', 2), mk('b', 3), mk('d', 4, { detail: 'delta prose' })]);
        assert(detailOrder(added).join(',') === 'c,a,b,d', 'add stubs a section for the new id');
        assert(proseFor(added, 'd') === 'delta prose', 'add uses the new step transient detail');

        // REMOVE prune: drop a → its section is pruned
        const removed = rekeyDetailSections(added, [mk('c', 1), mk('b', 2), mk('d', 3)]);
        assert(detailOrder(removed).join(',') === 'c,b,d', 'remove prunes the orphan detail section');
        assert(proseFor(removed, 'a') === null, 'removed step prose gone');

        // idempotent
        const again = rekeyDetailSections(removed, [mk('c', 1), mk('b', 2), mk('d', 3)]);
        assert(again === removed, 'rekeyDetailSections is idempotent');
        console.log('    ✅ rekeyDetailSections invariant holds across backfill/reorder/add/remove');
    }

    // ── D. save round-trip through the real saver (frontmatterSaver wiring) ──
    console.log('  • real-fs round-trip: add/remove/reorder keep body detail sections id-correct...');
    {
        const root = path.join(TMP, 'ws');
        await fs.remove(root);
        await fs.ensureDir(path.join(root, '.loom'));
        await fs.ensureDir(path.join(root, 'loom', 'demo'));
        const { id: threadUlid } = await createThread({ weaveSlug: 'demo', threadSlug: 'demo' }, { getActiveLoomRoot: () => root, saveDoc, fs });

        const created = await weavePlan(
            {
                weaveSlug: 'demo', threadUlid, goal: 'build it', title: 'Demo Plan',
                steps: [
                    { description: 'First', title: 'First', detail: 'first detail' },
                    { description: 'Second', title: 'Second', detail: 'second detail' },
                    { description: 'Third', title: 'Third', detail: 'third detail' },
                ],
            } as any,
            { loadWeave, saveDoc, loadDoc, fs, loomRoot: root } as any,
        );

        const loadWeaveStrict = async (r: string, w: string) => {
            const x = await loadWeave(r, w);
            if (!x) throw new Error(`Weave not found: ${w}`);
            return x;
        };
        const deps = {
            loadWeave: loadWeaveStrict,
            runEvent: (weaveId: string, event: any) => runEvent(weaveId, event, { loadWeave: loadWeaveStrict, saveDocs, loomRoot: root }),
            loomRoot: root,
        };

        // created body already carries markers (serializePlanBody + saver)
        const born: any = await loadDoc(created.filePath);
        assert(detailOrder(born.content).join(',').split(',').length === 3, 'created plan body has 3 marker-tagged detail sections');
        const ids0 = detailOrder(born.content);

        // reorder → [3rd, 1st, 2nd]
        await reorderSteps({ planId: created.id, orderedStepIds: [ids0[2], ids0[0], ids0[1]] }, deps);
        const afterReorder: any = await loadDoc(created.filePath);
        assert(detailOrder(afterReorder.content).join(',') === [ids0[2], ids0[0], ids0[1]].join(','), 'saved body detail reflows by id after reorder');
        assert(proseFor(afterReorder.content, ids0[2]) === 'third detail', 'reorder kept prose with its id through the saver');

        // add a step with detail (append)
        const addRes = await addStep({ planId: created.id, step: { description: 'Fourth', title: 'Fourth', detail: 'fourth detail' } }, deps);
        const newId = addRes.plan.steps[addRes.plan.steps.length - 1].id;
        const afterAdd: any = await loadDoc(created.filePath);
        assert(detailOrder(afterAdd.content).includes(newId), 'saved body gained the new step detail section');
        assert(proseFor(afterAdd.content, newId) === 'fourth detail', 'new step detail persisted through the saver');

        // remove the first id (ids0[0]) → its section pruned
        const rmRes = await removeStep({ planId: created.id, stepId: ids0[0] }, deps);
        assert(Array.isArray(rmRes.strippedBlockers), 'removeStep reports strippedBlockers');
        const afterRemove: any = await loadDoc(created.filePath);
        assert(!detailOrder(afterRemove.content).includes(ids0[0]), 'removed step detail section pruned from saved body');
        assert(proseFor(afterRemove.content, ids0[2]) === 'third detail', 'surviving detail prose intact after remove');
        console.log('    ✅ round-trip: saver tracks detail sections by id across add/remove/reorder');
    }

    await fs.remove(TMP);
    console.log('\n✅ step-crud tests passed\n');
}

run().catch(e => { console.error('❌', e); process.exit(1); });
