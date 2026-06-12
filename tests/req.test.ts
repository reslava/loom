import { assert } from './test-utils.ts';
import { parseReq, getThreadStatus, isReqStale, getReqStaleDocs } from '../packages/core/dist/index.js';

async function run() {
    console.log('🔁 Running req tests...\n');

    // ── parseReq buckets by ID prefix and ignores non-handle prose ──
    console.log('  • parseReq buckets IN/EX/C and ignores prose...');
    {
        const body = [
            '### ✅ Included',
            '- `IN1` User registration with email/password.',
            '- `IN2` Login flow with session management.',
            '',
            '### ❌ Excluded',
            '- `EX1` **Interaction testing** — no manual smoke-test steps.',
            '',
            '### ⛓ Constraints',
            '- `C1` TypeScript only — no new runtime dependency.',
            '- `C2` Must run offline.',
            '',
            'Trailing prose that is not a requirement.',
            '- a plain bullet with no handle',
            '- `XYZ9` a code token that is not a requirement handle',
        ].join('\n');

        const parsed = parseReq(body);
        assert(parsed.included.length === 2, `included: expected 2, got ${parsed.included.length}`);
        assert(parsed.excluded.length === 1, `excluded: expected 1, got ${parsed.excluded.length}`);
        assert(parsed.constraints.length === 2, `constraints: expected 2, got ${parsed.constraints.length}`);
        assert(parsed.included[0].id === 'IN1', 'IN1 id parsed');
        assert(
            parsed.included[0].text === 'User registration with email/password.',
            `IN1 text parsed, got: ${parsed.included[0].text}`,
        );
        assert(parsed.excluded[0].text.startsWith('**Interaction testing**'), 'EX1 keeps inline markdown');
        assert(parsed.constraints[1].id === 'C2', 'C2 id parsed');
        console.log('    ✅ buckets by prefix, ignores prose + non-handle code tokens');
    }

    // ── Heading-independent: items bucket by prefix even with no section headings ──
    console.log('  • parseReq is heading-independent...');
    {
        const body = [
            '- `C1` constraint first',
            '- `IN1` included second',
            '* `EX1` excluded third (asterisk bullet)',
        ].join('\n');
        const parsed = parseReq(body);
        assert(
            parsed.constraints.length === 1 && parsed.included.length === 1 && parsed.excluded.length === 1,
            'one of each bucketed without headings / with mixed bullet markers',
        );
        console.log('    ✅ no headings needed; - and * bullets both parse');
    }

    // ── the `~dropped` marker retires an item without deleting the handle ──
    console.log('  • parseReq reads the ~dropped marker...');
    {
        const body = [
            '### ✅ Included',
            '- `IN1` Still in force.',
            '- `IN2` ~dropped Superseded by IN7.',
            '- `IN3` ~DROPPED case-insensitive marker.',
        ].join('\n');
        const parsed = parseReq(body);
        assert(parsed.included[0].status === 'active', 'IN1 defaults to active');
        assert(parsed.included[1].status === 'dropped', 'IN2 marked dropped');
        assert(parsed.included[1].text === 'Superseded by IN7.', `IN2 marker stripped from text, got: ${parsed.included[1].text}`);
        assert(parsed.included[2].status === 'dropped', 'IN3 dropped marker is case-insensitive');
        console.log('    ✅ ~dropped sets status and is stripped from text; default is active');
    }

    // ── A locked req is perpetual context — must not block a thread reaching DONE ──
    console.log('  • a locked req does not block DONE...');
    {
        const base = { created: '2026-06-05', version: 1, tags: [], parent_id: null, requires_load: [], content: '' };
        const doneIdea = { ...base, type: 'idea', id: 'id_x', title: 'I', status: 'done' };
        const lockedReq = { ...base, type: 'req', id: 'rq_x', title: 'R', status: 'locked' };
        const thread = {
            id: 't', weaveId: 'w', idea: doneIdea, req: lockedReq,
            plans: [], dones: [], chats: [], refDocs: [], allDocs: [doneIdea, lockedReq],
        };
        assert(getThreadStatus(thread as any) === 'DONE', 'a perpetual locked req must not block DONE');
        console.log('    ✅ req excluded from every-done predicate');
    }

    // ── req-staleness: a locked req newer than a doc's req_version ──
    console.log('  • isReqStale + getReqStaleDocs flag docs built against an older locked req...');
    {
        const lockedReqV2: any = { type: 'req', status: 'locked', version: 2 };
        const draftReqV2: any = { type: 'req', status: 'draft', version: 2 };
        assert(isReqStale({ req_version: 1 }, lockedReqV2) === true, 'v1 doc vs locked req v2 → stale');
        assert(isReqStale({ req_version: 2 }, lockedReqV2) === false, 'v2 doc vs req v2 → not stale');
        assert(isReqStale({}, lockedReqV2) === false, 'no baseline → not stale');
        assert(isReqStale({ req_version: 1 }, draftReqV2) === false, 'a draft req never makes anything stale');

        const idea: any = { type: 'idea', id: 'i', status: 'active', req_version: 1, version: 1 };
        const design: any = { type: 'design', id: 'd', status: 'active', req_version: 2, version: 1 };
        const donePlan: any = { type: 'plan', id: 'p', status: 'done', req_version: 1, version: 1 };
        const thread: any = {
            id: 't', weaveId: 'w', idea, design, req: lockedReqV2,
            plans: [donePlan], dones: [], chats: [], refDocs: [], allDocs: [idea, design, donePlan],
        };
        const stale = getReqStaleDocs(thread).map((d: any) => d.id);
        assert(stale.includes('i'), 'the v1 idea must be req-stale');
        assert(!stale.includes('d'), 'the v2 design must not be req-stale');
        assert(!stale.includes('p'), 'a done plan is never flagged stale (even with an old req_version)');
        console.log('    ✅ isReqStale + getReqStaleDocs correct');
    }

    console.log('\n✅ req tests passed\n');
}

run().catch(e => { console.error('❌', e); process.exit(1); });
