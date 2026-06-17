import { assert } from './test-utils.ts';
import { buildRoadmap } from '../packages/core/dist';

// buildRoadmap now surfaces the shipped release per history node (from plan.actual_release)
// and derives currentRelease = max(actual_release). Pure read — minimal LoomState shapes.

function manifest(ulid: string): any {
    return { type: 'thread', id: ulid, title: ulid, status: 'active', created: '2026-01-01', version: 1, tags: [], parent_id: null, requires_load: [], priority: 100, depends_on: [], content: '' };
}
function plan(id: string, status: string, extra: any = {}): any {
    return { type: 'plan', id, title: id, status, created: '2026-01-01', version: 1, steps: [], ...extra };
}
function done(id: string, parentId: string, created: string): any {
    return { type: 'done', id, title: id, status: 'done', parent_id: parentId, created, version: 1 };
}
function thread(weaveId: string, id: string, opts: any = {}): any {
    const { manifest: m, plans = [], dones = [] } = opts;
    const allDocs = [m, ...plans, ...dones].filter(Boolean);
    return { id, weaveId, manifest: m, plans, dones, chats: [], refDocs: [], allDocs };
}
function weave(id: string, threads: any[]): any { return { id, threads }; }
function state(weaves: any[]): any { return { weaves, archivedWeaves: [] }; }

function relOf(history: any[], planId: string): string | null {
    return history.find(h => h.planId === planId)?.release;
}

async function run() {
    console.log('📦 Running roadmap-release surfacing tests...\n');

    // 1. history nodes carry the plan's actual_release; currentRelease = max.
    {
        const s = state([weave('w', [
            thread('w', 'a', { manifest: manifest('th_a'), plans: [plan('pl_a', 'done', { actual_release: '1.0.0' })], dones: [done('dn_a', 'pl_a', '2026-02-01')] }),
            thread('w', 'b', { manifest: manifest('th_b'), plans: [plan('pl_b', 'done', { actual_release: '1.2.0' })], dones: [done('dn_b', 'pl_b', '2026-03-01')] }),
            thread('w', 'c', { manifest: manifest('th_c'), plans: [plan('pl_c', 'done')], dones: [done('dn_c', 'pl_c', '2026-04-01')] }),
        ])]);
        const r = buildRoadmap(s);
        assert(relOf(r.history, 'pl_a') === '1.0.0', 'pl_a carries its release');
        assert(relOf(r.history, 'pl_b') === '1.2.0', 'pl_b carries its release');
        assert(relOf(r.history, 'pl_c') === null, 'unstamped plan release is null');
        assert(r.currentRelease === '1.2.0', 'currentRelease is the max actual_release (numeric, not lexical)');
        console.log('  ✅ release per node + currentRelease = max');
    }

    // 2. no stamped plan anywhere → currentRelease null (derive-only, no external read).
    {
        const s = state([weave('w', [
            thread('w', 'a', { manifest: manifest('th_a'), plans: [plan('pl_a', 'done')], dones: [done('dn_a', 'pl_a', '2026-02-01')] }),
        ])]);
        const r = buildRoadmap(s);
        assert(r.currentRelease === null, 'empty/unstamped history → currentRelease null');
        console.log('  ✅ derive-only: no stamps → null');
    }

    console.log('\n✅ All roadmap-release tests passed');
}

run().catch(e => { console.error('❌ roadmap-release test failed:', e); process.exit(1); });
