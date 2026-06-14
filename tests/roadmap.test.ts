import { assert } from './test-utils.ts';
import { buildRoadmap } from '../packages/core/dist';

// Pure unit tests for buildRoadmap — no filesystem, no CLI. We construct minimal
// LoomState shapes directly and assert the derived roadmap (status overlay,
// topo+priority order, dependency blocked-on, history, and diagnostics).

function manifest(ulid: string, priority: number, deps: string[] = [], created = '2026-01-01'): any {
    return {
        type: 'thread', id: ulid, title: ulid, status: 'active', created,
        version: 1, tags: [], parent_id: null, requires_load: [],
        priority, depends_on: deps, content: '',
    };
}
function plan(id: string, status: string, extra: any = {}): any {
    return { type: 'plan', id, title: id, status, created: '2026-01-01', version: 1, steps: [], ...extra };
}
function done(id: string, parentId: string, created: string): any {
    return { type: 'done', id, title: id, status: 'done', parent_id: parentId, created, version: 1 };
}
function thread(weaveId: string, id: string, opts: any = {}): any {
    const { manifest: m, plans = [], dones = [], idea, design } = opts;
    const allDocs = [m, idea, design, ...plans, ...dones].filter(Boolean);
    return { id, weaveId, manifest: m, idea, design, plans, dones, chats: [], refDocs: [], allDocs };
}
function weave(id: string, threads: any[]): any { return { id, threads }; }
function state(weaves: any[], archivedWeaves: any[] = []): any { return { weaves, archivedWeaves }; }

function nodeBy(list: any[], threadId: string): any {
    return list.find(n => n.threadId === threadId);
}

async function run() {
    console.log('🗺️  Running roadmap (buildRoadmap) tests...\n');

    // 1. Priority ordering among independent pending threads (lower = earlier).
    {
        const s = state([weave('w', [
            thread('w', 'high', { manifest: manifest('th_high', 200) }),
            thread('w', 'low', { manifest: manifest('th_low', 100) }),
        ])]);
        const r = buildRoadmap(s);
        assert(r.future.length === 2, 'both pending threads land in future');
        assert(r.future[0].threadId === 'low', 'lower priority sorts first');
        assert(r.future[1].threadId === 'high', 'higher priority sorts second');
        console.log('  ✅ priority ordering');
    }

    // 2. Dependency-blocked: B depends on an unfinished A → B blocked, A before B.
    {
        const s = state([weave('w', [
            thread('w', 'a', { manifest: manifest('th_a', 100) }),
            thread('w', 'b', { manifest: manifest('th_b', 100, ['th_a']) }),
        ])]);
        const r = buildRoadmap(s);
        const b = nodeBy(r.future, 'b');
        assert(b.status === 'blocked', 'B is dependency-blocked');
        assert(b.blockedOn.includes('th_a'), 'B.blockedOn names A');
        const ai = r.future.findIndex(n => n.threadId === 'a');
        const bi = r.future.findIndex(n => n.threadId === 'b');
        assert(ai < bi, 'dependency A is ordered before B');
        console.log('  ✅ dependency blocked-on + topo order');
    }

    // 3. Satisfied dependency: A done → B no longer blocked; A's plan is history.
    {
        const s = state([weave('w', [
            thread('w', 'a', {
                manifest: manifest('th_a', 100),
                plans: [plan('pl_a', 'done')],
                dones: [done('dn_a', 'pl_a', '2026-02-01')],
            }),
            thread('w', 'b', { manifest: manifest('th_b', 100, ['th_a']) }),
        ])]);
        const r = buildRoadmap(s);
        const b = nodeBy(r.future, 'b');
        assert(b && b.status === 'pending', 'B is pending (dependency satisfied)');
        assert(b.blockedOn.length === 0, 'B has no blockers');
        assert(!nodeBy(r.future, 'a') && !nodeBy(r.present, 'a'), 'done thread A is not in future/present');
        assert(r.history.length === 1 && r.history[0].date === '2026-02-01', 'A plan is in history with done-doc date');
        console.log('  ✅ satisfied dependency + history dating');
    }

    // 4. Cycle: A↔B → cycle diagnostics, both still rendered.
    {
        const s = state([weave('w', [
            thread('w', 'a', { manifest: manifest('th_a', 100, ['th_b']) }),
            thread('w', 'b', { manifest: manifest('th_b', 100, ['th_a']) }),
        ])]);
        const r = buildRoadmap(s);
        const cycles = r.diagnostics.filter(d => d.kind === 'cycle');
        assert(cycles.length === 2, 'both cyclic threads get a cycle diagnostic');
        assert(nodeBy(r.future, 'a') && nodeBy(r.future, 'b'), 'cyclic threads still render in future');
        console.log('  ✅ cycle detection (renders, does not crash)');
    }

    // 5. Dangling dependency → diagnostic + blocked.
    {
        const s = state([weave('w', [
            thread('w', 'a', { manifest: manifest('th_a', 100, ['th_ghost']) }),
        ])]);
        const r = buildRoadmap(s);
        const dangling = r.diagnostics.filter(d => d.kind === 'dangling_dep');
        assert(dangling.length === 1 && dangling[0].refs!.includes('th_ghost'), 'dangling dep diagnostic names the target');
        assert(nodeBy(r.future, 'a').status === 'blocked', 'thread with dangling dep is blocked');
        console.log('  ✅ dangling dependency');
    }

    // 6. Missing manifest → diagnostic; thread still appears.
    {
        const s = state([weave('w', [thread('w', 'orphan', {})])]);
        const r = buildRoadmap(s);
        const missing = r.diagnostics.filter(d => d.kind === 'missing_manifest');
        assert(missing.length === 1 && missing[0].threadId === 'orphan', 'missing-manifest diagnostic emitted');
        assert(nodeBy(r.future, 'orphan'), 'manifest-less thread still renders');
        console.log('  ✅ missing manifest diagnostic (reads never mutate)');
    }

    // 7. History newest-first across threads.
    {
        const s = state([weave('w', [
            thread('w', 'a', { manifest: manifest('th_a', 100), plans: [plan('pl_a', 'done')], dones: [done('dn_a', 'pl_a', '2026-01-15')] }),
            thread('w', 'b', { manifest: manifest('th_b', 100), plans: [plan('pl_b', 'done')], dones: [done('dn_b', 'pl_b', '2026-03-20')] }),
        ])]);
        const r = buildRoadmap(s);
        assert(r.history.length === 2, 'both done plans in history');
        assert(r.history[0].date === '2026-03-20', 'newest shipped plan first');
        console.log('  ✅ history newest-first');
    }

    // 8. Determinism — re-deriving over unchanged state yields identical output.
    {
        const mk = () => state([weave('w', [
            thread('w', 'a', { manifest: manifest('th_a', 100) }),
            thread('w', 'b', { manifest: manifest('th_b', 50, ['th_a']) }),
        ])]);
        assert(JSON.stringify(buildRoadmap(mk())) === JSON.stringify(buildRoadmap(mk())), 'deterministic re-derivation');
        console.log('  ✅ deterministic');
    }

    console.log('\n✅ All roadmap tests passed');
}

run().catch(e => { console.error('❌ roadmap test failed:', e); process.exit(1); });
