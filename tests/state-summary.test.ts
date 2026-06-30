import { assert } from './test-utils.ts';
import { toStateSummary } from '../packages/core/dist';

// Pure unit tests for toStateSummary — the cheap session-start map. No filesystem.
// We construct minimal LoomState shapes directly and assert the projection:
// weave/thread skeleton + status, active plan + pending-step count, stale flag,
// carried summary counts — and crucially that NO step bodies or doc content leak.

function step(id: string, status: string): any {
    return { id, order: 1, status, title: id, description: `BODY-${id}-should-not-leak`, files_touched: [], blockedBy: [], satisfies: [] };
}
function plan(id: string, status: string, steps: any[] = []): any {
    return { type: 'plan', id, title: id, status, created: '2026-01-01', version: 1, design_version: 1, target_version: '0.1.0', steps };
}
function manifest(title: string, priority: number): any {
    return { type: 'thread', id: 'th_x', title, status: 'active', created: '2026-01-01', version: 1, priority, depends_on: [] };
}
function thread(weaveId: string, id: string, opts: any = {}): any {
    const { manifest: m, idea, plans = [], stale = [] } = opts;
    const allDocs = [m, idea, ...plans].filter(Boolean);
    return { id, weaveId, manifest: m, idea, plans, dones: [], chats: [], refDocs: [], allDocs, stale };
}
function weave(id: string, threads: any[]): any {
    return { id, threads, looseFibers: [], chats: [], refDocs: [], allDocs: threads.flatMap(t => t.allDocs) };
}
function state(weaves: any[], summaryOverrides: any = {}): any {
    return {
        loomRoot: '/x', mode: 'mono', loomName: '(local)',
        globalDocs: [], globalChats: [], weaves, archivedWeaves: [], archivedLooseDocs: [],
        index: {}, generatedAt: '2026-07-01T00:00:00.000Z',
        summary: { totalWeaves: weaves.length, activeWeaves: 0, implementingWeaves: 0, doneWeaves: 0, totalPlans: 0, stalePlans: 0, staleIdeas: 0, staleDesigns: 0, blockedSteps: 0, reqCoverageGaps: 0, ...summaryOverrides },
    };
}

function threadOf(summary: any, weaveId: string, threadId: string): any {
    return summary.weaves.find((w: any) => w.id === weaveId)?.threads.find((t: any) => t.id === threadId);
}

async function run() {
    console.log('🗂️  Running state-summary (toStateSummary) tests...\n');

    // 1. Active plan → activePlanId set, pendingStepCount counts non-done/cancelled.
    {
        const s = state([weave('w', [
            thread('w', 't', {
                manifest: manifest('T', 100),
                plans: [plan('pl_1', 'implementing', [step('a', 'done'), step('b', 'pending'), step('c', 'in_progress'), step('d', 'cancelled')])],
            }),
        ])]);
        const t = threadOf(toStateSummary(s), 'w', 't');
        assert(t.activePlanId === 'pl_1', 'activePlanId is the implementing plan');
        assert(t.pendingStepCount === 2, 'pendingStepCount excludes done + cancelled (b + c)');
        assert(t.status === 'implementing', 'status reflects implementing plan, lowercased');
        console.log('  ✅ active plan + pending-step count');
    }

    // 2. No implementing plan → activePlanId null, pendingStepCount 0.
    {
        const s = state([weave('w', [
            thread('w', 't', { manifest: manifest('T', 100), plans: [plan('pl_1', 'active', [step('a', 'pending')])] }),
        ])]);
        const t = threadOf(toStateSummary(s), 'w', 't');
        assert(t.activePlanId === null, 'activePlanId null when no plan is implementing');
        assert(t.pendingStepCount === 0, 'pendingStepCount 0 when no active plan');
        console.log('  ✅ no active plan → null / 0');
    }

    // 3. Title fallback: manifest.title → idea.title → id.
    {
        const s = state([weave('w', [
            thread('w', 'has-manifest', { manifest: manifest('Manifest Title', 100) }),
            thread('w', 'has-idea', { idea: { type: 'idea', id: 'id_x', title: 'Idea Title', status: 'active', created: '2026-01-01', version: 1 } }),
            thread('w', 'bare', {}),
        ])]);
        const sum = toStateSummary(s);
        assert(threadOf(sum, 'w', 'has-manifest').title === 'Manifest Title', 'manifest title wins');
        assert(threadOf(sum, 'w', 'has-idea').title === 'Idea Title', 'idea title is the fallback');
        assert(threadOf(sum, 'w', 'bare').title === 'bare', 'id is the last-resort title');
        console.log('  ✅ title fallback chain');
    }

    // 4. Stale flag + default priority for a manifest-less thread.
    {
        const s = state([weave('w', [
            thread('w', 'stale-one', { stale: [{ docId: 'd', actionable: true }] }),
        ])]);
        const t = threadOf(toStateSummary(s), 'w', 'stale-one');
        assert(t.stale === true, 'stale true when the thread has stale entries');
        assert(t.priority === 1_000_000, 'manifest-less thread gets DEFAULT_ROADMAP_PRIORITY');
        console.log('  ✅ stale flag + default priority');
    }

    // 5. Carried summary counts.
    {
        const s = state([weave('w', [thread('w', 't', { manifest: manifest('T', 100) })])], { totalPlans: 7, stalePlans: 2, blockedSteps: 3 });
        const sum = toStateSummary(s);
        assert(sum.summary.totalPlans === 7 && sum.summary.stalePlans === 2 && sum.summary.blockedSteps === 3, 'summary counts carried from state');
        assert((sum.summary as any).reqCoverageGaps === undefined, 'only the four chosen counts are projected');
        console.log('  ✅ carried summary counts');
    }

    // 6. No step bodies or doc content leak into the serialized summary.
    {
        const s = state([weave('w', [
            thread('w', 't', { manifest: manifest('T', 100), plans: [plan('pl_1', 'implementing', [step('secret', 'pending')])] }),
        ])]);
        const json = JSON.stringify(toStateSummary(s));
        assert(!json.includes('BODY-'), 'no step description bodies in the summary');
        assert(!json.includes('files_touched'), 'no step fields in the summary');
        assert(json.length < 1000, 'summary of a one-thread state is tiny');
        console.log('  ✅ no body/content leak (kilobytes, not megabytes)');
    }

    console.log('\n✅ All state-summary tests passed');
}

run().catch(e => { console.error('❌ state-summary test failed:', e); process.exit(1); });
