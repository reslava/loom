import { assert } from './test-utils.ts';
import { buildForwardSignal, extractParkedSection, getReportKind } from '../packages/core/dist';
import { renderForwardSignal, applyProspectiveFraming } from '../packages/mcp/dist/prompts/report';

// Pure unit tests for the prospective forward-signal path — no filesystem, no CLI. Build
// minimal LoomState-shaped fixtures and assert the four Tier-1 detectors (parked-decision,
// stalled-intent, blocked-work, drift-debt), deterministic ranking, filters/empty-set, the
// render slice, and the applyProspectiveFraming knob logic. A fixed `now` keeps ageDays and
// therefore the ranking tie-break deterministic.

const NOW = '2026-07-15';

function idea(id: string, created: string, body = ''): any {
    return { type: 'idea', id, title: id, status: 'active', created, version: 1, tags: [], parent_id: null, requires_load: [], content: body };
}
function design(id: string, created: string, version = 1, body = ''): any {
    return { type: 'design', id, title: id, status: 'active', created, version, tags: [], parent_id: null, requires_load: [], content: body };
}
function step(id: string, order: number, status: string, blockedBy: string[] = []): any {
    return { id, order, status, title: id, description: `step ${id}`, files_touched: [], blockedBy, satisfies: [] };
}
function plan(id: string, created: string, status: string, opts: any = {}): any {
    return {
        type: 'plan', id, title: id, status, created, updated: created, version: 1, tags: [], parent_id: null, requires_load: [],
        design_version: opts.designVersion ?? 1, target_version: '1.0.0', steps: opts.steps ?? [], content: opts.content ?? '',
    };
}
function thread(weaveSlug: string, id: string, arrays: any = {}): any {
    const { idea, design, req, plans = [], dones = [], chats = [], refDocs = [], manifest } = arrays;
    const allDocs = [idea, design, req, ...plans, ...dones, ...chats, ...refDocs].filter(Boolean);
    return { id, weaveSlug, idea, design, req, manifest, plans, dones, chats, refDocs, allDocs };
}
function weave(id: string, threads: any[]): any {
    return { id, threads, looseFibers: [], chats: [], refDocs: [], allDocs: [] };
}
function state(weaves: any[]): any {
    return { weaves, globalDocs: [], globalChats: [], archivedThreads: [], index: { documents: new Map() } };
}
const emptySig = { items: [], counts: { 'parked-decision': 0, 'stalled-intent': 0, 'blocked-work': 0, 'drift-debt': 0 }, totalItems: 0, filters: {}, isEmpty: true };

async function run() {
    console.log('🔮 Running buildForwardSignal tests...\n');

    // 1. extractParkedSection — verbatim section lift, heading-bounded, null when absent.
    {
        assert(extractParkedSection('## Open questions\n- a\n- b\n## Next\nx') === '- a\n- b', 'extracts the section, stops at the next same-level heading');
        assert(extractParkedSection('# T\n\nno section here') === null, 'null when there is no open-questions/deferred/parked heading');
        const deferred = extractParkedSection('### Deferred\ntext\n#### sub\nmore\n## Other\nz')!;
        assert(deferred.includes('text') && deferred.includes('more') && !deferred.includes('z'), 'a deeper (####) sub-heading stays in; a higher (##) heading ends the section');
        console.log('  ✅ extractParkedSection: verbatim, heading-bounded, null-safe');
    }

    // 2. parked-decision: an Open-questions section on the idea; leverage = downstream docs.
    {
        const s = state([weave('wf', [
            thread('wf', 't-park', {
                idea: idea('id-park', '2026-07-01', '# Idea\n\n## Open questions\n- should we do X?\n- and Y?\n\n## Next\nmore'),
                design: design('de-park', '2026-07-02'),
                plans: [plan('pl-park', '2026-07-03', 'implementing', { steps: [step('a', 1, 'pending')] })],
            }),
        ])]);
        const sig = buildForwardSignal(s, {}, NOW);
        const park = sig.items.find(i => i.group === 'parked-decision');
        assert(!!park && park.docId === 'id-park', 'parked-decision fires on the idea carrying the section');
        assert(park!.leverage === 2, `leverage = downstream docs (design + plan) = 2, got ${park?.leverage}`);
        assert(park!.ready === true, 'a parked decision is actionable now (ready)');
        assert(park!.detail.includes('should we do X'), 'detail lifts the first parked line');
        assert(sig.items.filter(i => i.group === 'parked-decision').length === 1, 'only the idea (not the section-free design) yields a parked item');
        console.log('  ✅ parked-decision: idea section, leverage=downstream, ready, detail');
    }

    // 3. stalled-intent: the three broken-chain shapes.
    {
        const gid = buildForwardSignal(state([weave('wf', [thread('wf', 't1', { idea: idea('id1', '2026-07-01') })])]), {}, NOW).items;
        assert(gid.length === 1 && gid[0].group === 'stalled-intent' && gid[0].detail.includes('no design'), 'idea → no design');

        const gde = buildForwardSignal(state([weave('wf', [thread('wf', 't2', { design: design('de2', '2026-07-01') })])]), {}, NOW).items;
        assert(gde.length === 1 && gde[0].detail.includes('no plan'), 'design → no plan');

        const gpl = buildForwardSignal(state([weave('wf', [thread('wf', 't3', {
            design: design('de3', '2026-07-01'),
            plans: [plan('pl3', '2026-07-02', 'active', { steps: [step('a', 1, 'pending')] })],
        })])]), {}, NOW).items.filter(i => i.group === 'stalled-intent');
        assert(gpl.length === 1 && gpl[0].detail.includes('never started'), 'plan exists but was never started');
        console.log('  ✅ stalled-intent: idea→no design, design→no plan, plan-not-started');
    }

    // 4. blocked-work (steps): chained blockers surface; not ready; leverage = dependent steps.
    {
        const sB = state([weave('wf', [thread('wf', 'tb', {
            design: design('deb', '2026-06-01'),
            plans: [plan('plb', '2026-06-02', 'implementing', {
                steps: [step('s1', 1, 'pending'), step('s2', 2, 'pending', ['s1']), step('s3', 3, 'pending', ['s2'])],
            })],
        })])]);
        const bw = buildForwardSignal(sB, {}, NOW).items.filter(i => i.group === 'blocked-work');
        assert(bw.length === 2, `s2 (waits on s1) and s3 (waits on s2) are blocked; s1 is the next unblocked step, got ${bw.length}`);
        assert(bw.every(i => i.ready === false), 'blocked steps are not ready');
        const s2item = bw.find(i => i.detail.includes('step s2'))!;
        assert(s2item.leverage === 1, `s2 blocks s3 → leverage 1, got ${s2item?.leverage}`);
        assert((s2item.refs ?? []).includes('s1'), 's2 refs its blocker s1');
        console.log('  ✅ blocked-work (steps): chained blockers, not ready, leverage=dependents, refs');
    }

    // 5. drift-debt: an actionable stale plan (plan.design_version < design.version).
    {
        const sD = state([weave('wf', [thread('wf', 'td', {
            design: design('ded', '2026-06-01', 2),
            plans: [plan('pld', '2026-06-02', 'implementing', { designVersion: 1, steps: [step('a', 1, 'pending')] })],
        })])]);
        const dd = buildForwardSignal(sD, {}, NOW).items.filter(i => i.group === 'drift-debt');
        assert(dd.length === 1 && dd[0].docId === 'pld', 'the stale plan surfaces as drift-debt');
        assert(dd[0].detail.includes('plan_design_stale'), 'detail names the stale reason');
        assert(dd[0].ready === true, 'reconciling drift is actionable now');
        console.log('  ✅ drift-debt: stale plan, reason, ready');
    }

    // 6. blocked-work (thread): a dependency-blocked thread surfaces from the roadmap overlay.
    {
        const depUlid = 'th_dep', blkUlid = 'th_blk';
        const sT = state([weave('wf', [
            thread('wf', 't-dep', { design: design('ded2', '2026-06-01'), manifest: { id: depUlid, priority: 100, created: '2026-06-01', depends_on: [] } }),
            thread('wf', 't-blk', {
                design: design('deb2', '2026-06-01'),
                plans: [plan('plk', '2026-06-02', 'implementing', { steps: [step('a', 1, 'pending')] })],
                manifest: { id: blkUlid, priority: 100, created: '2026-06-02', depends_on: [depUlid] },
            }),
        ])]);
        const bt = buildForwardSignal(sT, {}, NOW).items.filter(i => i.group === 'blocked-work' && i.docType === 'thread');
        assert(bt.length === 1 && bt[0].docId === blkUlid, 'the thread depending on an unfinished thread is blocked-work');
        assert((bt[0].refs ?? []).includes(depUlid), 'the blocked thread refs its unfinished dependency');
        assert(bt[0].ready === false, 'a dependency-blocked thread is not ready');
        console.log('  ✅ blocked-work (thread): roadmap dependency block, refs, not ready');
    }

    // 7. A fully-done thread yields no signal at all (open-material only).
    {
        const sDone = state([weave('wf', [thread('wf', 'tdone', {
            idea: { ...idea('idd', '2026-06-01'), status: 'done' },
            design: { ...design('dedone', '2026-06-01'), status: 'done' },
            plans: [plan('pldone', '2026-06-02', 'done', { steps: [step('a', 1, 'done')] })],
        })])]);
        const dsig = buildForwardSignal(sDone, {}, NOW);
        assert(dsig.items.length === 0 && dsig.isEmpty, 'a done thread contributes nothing (and empty state reports isEmpty)');
        console.log('  ✅ done thread excluded; isEmpty on no open material');
    }

    // 8. Filters (weave / thread / date) scope the scan; a future `from` empties it.
    {
        const sf = state([
            weave('wa', [thread('wa', 'ta', { idea: idea('ia', '2026-07-01') })]),
            weave('wb', [thread('wb', 'tb', { idea: idea('ib', '2026-07-01') })]),
        ]);
        assert(buildForwardSignal(sf, {}, NOW).items.length === 2, 'both threads stall (idea→no design)');
        assert(buildForwardSignal(sf, { weaves: ['wa'] }, NOW).items.every(i => i.weaveSlug === 'wa'), 'weave filter scopes to wa');
        assert(buildForwardSignal(sf, { threads: ['tb'] }, NOW).items.every(i => i.threadSlug === 'tb'), 'thread filter scopes to tb');
        assert(buildForwardSignal(sf, { from: '2026-08-01' }, NOW).isEmpty, 'a from-date past every created empties the signal');
        console.log('  ✅ filters: weave / thread / date window; empty on out-of-window');
    }

    // 9. Ranking: leverage desc, then ready-first — deterministic and pre-sorted.
    {
        const sMix = state([weave('wf', [
            thread('wf', 'tA', {
                idea: idea('id-A', '2026-07-01', '## Open questions\n- q?'),
                design: design('de-A', '2026-07-02'),
                plans: [plan('pl-A1', '2026-07-03', 'implementing', { steps: [step('a', 1, 'pending')] }),
                        plan('pl-A2', '2026-07-04', 'implementing', { steps: [step('b', 1, 'pending')] })],
            }), // parked: leverage = design(1)+2 plans = 3, ready
            thread('wf', 'tB', {
                design: design('de-B', '2026-06-01'),
                plans: [plan('pl-B', '2026-06-02', 'implementing', { steps: [step('s1', 1, 'pending'), step('s2', 2, 'pending', ['s1'])] })],
            }), // blocked step s2: leverage 0, not ready
            thread('wf', 'tC', { design: design('de-C', '2026-05-01') }), // stalled design→no plan: leverage 0, ready
        ])]);
        const items = buildForwardSignal(sMix, {}, NOW).items;
        assert(items[0].leverage === 3 && items[0].group === 'parked-decision', 'highest-leverage item leads');
        for (let i = 1; i < items.length; i++) {
            const a = items[i - 1], b = items[i];
            assert(a.leverage >= b.leverage, `leverage non-increasing at ${i} (${a.leverage} < ${b.leverage})`);
            if (a.leverage === b.leverage) assert(!(a.ready === false && b.ready === true), `at equal leverage a ready item must not sort after a blocked one (index ${i})`);
        }
        console.log('  ✅ ranking: leverage desc, ready-first, pre-sorted');
    }

    // 10. renderForwardSignal — empty stop-signal, and a grouped/cited non-empty slice.
    {
        const empty = renderForwardSignal(emptySig as any);
        assert(/NO OPEN MATERIAL/.test(empty) && /stop/i.test(empty), 'empty render is a stop-signal, no report framing');
        const s = state([weave('wf', [thread('wf', 't-park', {
            idea: idea('id-park', '2026-07-01', '## Open questions\n- decide X?'),
            design: design('de-park', '2026-07-02'),
        })])]);
        const r = renderForwardSignal(buildForwardSignal(s, {}, NOW));
        assert(/\[parked-decision\]/.test(r) && /id: id-park/.test(r), 'render tags each item with its group + source id');
        assert(/leverage:/.test(r) && /ready:/.test(r), 'render surfaces the ranking signal per item');
        assert(/parked-decision: \d/.test(r), 'render header carries per-group counts');
        console.log('  ✅ renderForwardSignal: empty stop-signal + grouped, cited, counted slice');
    }

    // 11. applyProspectiveFraming — the pure knob logic.
    {
        assert(applyProspectiveFraming('BASE', 'docset', { forward: false }) === 'BASE', 'a plain retrospective report with no flags is unchanged');
        const fwd = applyProspectiveFraming('BASE', 'docset', { forward: true });
        assert(/Forward mode/.test(fwd) && /Creativity: closed/.test(fwd), 'forward mode adds the reframe + default-closed creativity (prospective)');
        const fsBase = applyProspectiveFraming('BASE', 'forward-signal', { forward: false });
        assert(!/Forward mode/.test(fsBase) && /Creativity: closed/.test(fsBase), 'forward-signal is already forward (no reframe) but prospective (closed default)');
        assert(/Creativity: creative/.test(applyProspectiveFraming('BASE', 'forward-signal', { forward: false, creativity: 'creative' })), 'explicit creative clause applied');
        assert(/Creativity: creative/.test(applyProspectiveFraming('BASE', 'docset', { forward: false, creativity: 'creative' })), 'explicit creativity honored even on a retrospective kind');
        console.log('  ✅ applyProspectiveFraming: reframe on retrospective, no-op on forward-signal, creativity default + override');
    }

    // 12. Registry: next-work is a forward-signal kind; existing kinds carry a source.
    {
        const nw = getReportKind('next-work')!;
        assert(!!nw && nw.source === 'forward-signal' && nw.docTypes.length === 0, 'next-work registered: source forward-signal, empty docTypes');
        assert(/ranked/i.test(nw.promptFraming) && /cite/i.test(nw.promptFraming) && /stop/i.test(nw.promptFraming), 'framing asks for a ranked, cited list with an empty-set stop');
        assert(getReportKind('project-overview')!.source === 'roadmap', 'project-overview tagged roadmap');
        assert(getReportKind('release-notes')!.source === 'release-notes', 'release-notes tagged release-notes');
        assert(getReportKind('decisions')!.source === 'docset', 'decisions tagged docset');
        console.log('  ✅ registry: next-work forward-signal + existing kinds carry source');
    }

    console.log('\n✅ buildForwardSignal tests passed');
}

run().catch(e => { console.error('❌', e); process.exit(1); });
