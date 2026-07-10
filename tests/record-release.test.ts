import { assert } from './test-utils.ts';
import { recordRelease, backfillReleases } from '../packages/app/dist';

// Unit tests for the recordRelease / backfillReleases use-cases. Deps are injected:
// loadState returns a fixed in-memory state, runEvent is captured (never persists), so
// we assert exactly which plans got a RECORD_RELEASE event and with which version.

function manifest(ulid: string): any {
    return { type: 'thread', id: ulid, title: ulid, status: 'active', created: '2026-01-01', version: 1, tags: [], parent_id: null, requires_load: [], priority: 100, depends_on: [], content: '' };
}
function plan(id: string, status: string, extra: any = {}): any {
    return { type: 'plan', id, title: id, status, created: '2026-01-01', version: 1, steps: [], ...extra };
}
function done(id: string, parentId: string, created: string): any {
    return { type: 'done', id, title: id, status: 'done', parent_id: parentId, created, version: 1 };
}
function thread(weaveSlug: string, id: string, opts: any = {}): any {
    const { manifest: m, plans = [], dones = [] } = opts;
    const allDocs = [m, ...plans, ...dones].filter(Boolean);
    return { id, weaveSlug, manifest: m, plans, dones, chats: [], refDocs: [], allDocs };
}
function weave(id: string, threads: any[]): any { return { id, threads }; }
function state(weaves: any[]): any { return { weaves, archivedWeaves: [] }; }

function capture(s: any) {
    const events: Array<{ weaveSlug: string; event: any }> = [];
    const deps = {
        loadState: async () => s,
        runEvent: async (weaveSlug: string, event: any) => { events.push({ weaveSlug, event }); },
    };
    return { events, deps };
}
const relFor = (events: any[], planId: string) =>
    events.find(e => e.event.planId === planId)?.event.release;

async function run() {
    console.log('🏷️  Running recordRelease / backfillReleases tests...\n');

    // Live: stamp only unstamped done plans; skip already-stamped; ignore non-done.
    {
        const s = state([weave('w', [
            thread('w', 't', {
                manifest: manifest('th_t'),
                plans: [
                    plan('pl_unstamped', 'done'),
                    plan('pl_stamped', 'done', { actual_release: '0.9.0' }),
                    plan('pl_active', 'active'),
                ],
                dones: [done('dn_u', 'pl_unstamped', '2026-02-01'), done('dn_s', 'pl_stamped', '2026-01-10')],
            }),
        ])]);
        const { events, deps } = capture(s);
        const res = await recordRelease({ version: '1.0.0' }, deps);

        assert(events.length === 1, 'only the unstamped done plan fires an event');
        assert(events[0].event.type === 'RECORD_RELEASE' && events[0].event.planId === 'pl_unstamped', 'event targets the unstamped plan');
        assert(relFor(events, 'pl_unstamped') === '1.0.0', 'stamps the given version');
        assert(res.stamped.length === 1 && res.stamped[0].planId === 'pl_unstamped', 'result.stamped names it');
        assert(res.skipped.length === 1 && res.skipped[0].planId === 'pl_stamped' && res.skipped[0].reason === 'already-stamped', 'stamped plan skipped as already-stamped');
        console.log('  ✅ live: unstamped only (idempotent — already-stamped is the no-op)');
    }

    // Live + overwrite: re-stamps already-stamped plans (the correction path).
    {
        const s = state([weave('w', [
            thread('w', 't', {
                manifest: manifest('th_t'),
                plans: [plan('pl_unstamped', 'done'), plan('pl_stamped', 'done', { actual_release: '0.9.0' })],
                dones: [done('dn_u', 'pl_unstamped', '2026-02-01'), done('dn_s', 'pl_stamped', '2026-01-10')],
            }),
        ])]);
        const { events, deps } = capture(s);
        const res = await recordRelease({ version: '1.0.0', overwrite: true }, deps);
        assert(events.length === 2, 'overwrite fires for both done plans');
        assert(relFor(events, 'pl_stamped') === '1.0.0', 'overwrite re-stamps the previously-stamped plan');
        assert(res.skipped.length === 0, 'nothing skipped under overwrite');
        console.log('  ✅ live + overwrite: deliberate restamp');
    }

    // Backfill: assign each done plan to the version whose (prevDate, date] window covers it.
    {
        const s = state([weave('w', [
            thread('w', 't', {
                manifest: manifest('th_t'),
                plans: [plan('pl_old', 'done'), plan('pl_mid', 'done'), plan('pl_future', 'done')],
                dones: [
                    done('dn_old', 'pl_old', '2026-02-01'),    // ≤ 1.0.0 tag (2026-03-01)
                    done('dn_mid', 'pl_mid', '2026-05-01'),    // > 1.0.0, ≤ 1.1.0 tag (2026-06-01)
                    done('dn_fut', 'pl_future', '2026-07-01'), // after last tag → unshipped
                ],
            }),
        ])]);
        const { events, deps } = capture(s);
        const res = await backfillReleases({
            releaseDates: [{ version: '1.1.0', date: '2026-06-01' }, { version: '1.0.0', date: '2026-03-01' }], // unsorted on purpose
        }, deps);

        assert(relFor(events, 'pl_old') === '1.0.0', 'plan done before the first tag → 1.0.0');
        assert(relFor(events, 'pl_mid') === '1.1.0', 'plan done between tags → next tag (1.1.0)');
        assert(events.find(e => e.event.planId === 'pl_future') === undefined, 'plan done after the last tag is not stamped');
        assert(res.skipped.some(s2 => s2.planId === 'pl_future' && s2.reason === 'unshipped'), 'future plan skipped as unshipped');
        console.log('  ✅ backfill: date-range assignment (+ input order-independent)');
    }

    // Backfill respects already-stamped unless overwrite.
    {
        const s = state([weave('w', [
            thread('w', 't', {
                manifest: manifest('th_t'),
                plans: [plan('pl_x', 'done', { actual_release: '0.5.0' })],
                dones: [done('dn_x', 'pl_x', '2026-02-01')],
            }),
        ])]);
        const { events, deps } = capture(s);
        const res = await backfillReleases({ releaseDates: [{ version: '1.0.0', date: '2026-03-01' }] }, deps);
        assert(events.length === 0, 'already-stamped plan is not re-stamped by backfill');
        assert(res.skipped.some(s2 => s2.planId === 'pl_x' && s2.reason === 'already-stamped'), 'reported as already-stamped');
        console.log('  ✅ backfill: skips already-stamped');
    }

    console.log('\n✅ All recordRelease tests passed');
}

run().catch(e => { console.error('❌ recordRelease test failed:', e); process.exit(1); });
