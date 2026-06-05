import { assert } from './test-utils.ts';
import { parseReq, getThreadStatus } from '../packages/core/dist/index.js';

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

    console.log('\n✅ req tests passed\n');
}

run().catch(e => { console.error('❌', e); process.exit(1); });
