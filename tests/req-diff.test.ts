import { assert } from './test-utils.ts';
import { parseReq, diffReqHandles } from '../packages/core/dist/index.js';

const BASE = parseReq([
    '### ✅ Included',
    '- `IN1` Registration.',
    '- `IN2` Login.',
    '### ❌ Excluded',
    '- `EX1` Social login.',
    '### ⛓ Constraints',
    '- `C1` TypeScript only.',
].join('\n'));

async function run() {
    console.log('🔁 Running req-diff tests...\n');

    // ── append-only is allowed ──
    console.log('  • appending a fresh handle is ok...');
    {
        const next = parseReq([
            '- `IN1` Registration.',
            '- `IN2` Login.',
            '- `IN3` Password reset.',
            '- `EX1` Social login.',
            '- `C1` TypeScript only.',
        ].join('\n'));
        const diff = diffReqHandles(BASE, next);
        assert(diff.ok === true, 'append is ok');
        assert(diff.deleted.length === 0, 'nothing deleted');
        assert(diff.added.length === 1 && diff.added[0] === 'IN3', 'IN3 added');
        console.log('    ✅ append IN3 → ok');
    }

    // ── marking dropped keeps the handle present → not a deletion ──
    console.log('  • marking an item ~dropped is ok (handle survives)...');
    {
        const next = parseReq([
            '- `IN1` Registration.',
            '- `IN2` ~dropped Superseded.',
            '- `EX1` Social login.',
            '- `C1` TypeScript only.',
        ].join('\n'));
        const diff = diffReqHandles(BASE, next);
        assert(diff.ok === true, 'status change is ok');
        assert(diff.deleted.length === 0, 'a dropped handle is not deleted');
        console.log('    ✅ ~dropped IN2 → ok, IN2 still present');
    }

    // ── deleting a handle is refused ──
    console.log('  • deleting an existing handle is a violation...');
    {
        const next = parseReq([
            '- `IN1` Registration.',
            '- `EX1` Social login.',
            '- `C1` TypeScript only.',
        ].join('\n'));
        const diff = diffReqHandles(BASE, next);
        assert(diff.ok === false, 'deletion is not ok');
        assert(diff.deleted.length === 1 && diff.deleted[0] === 'IN2', 'IN2 reported deleted');
        console.log('    ✅ deleting IN2 → flagged');
    }

    // ── renumbering = old id vanishes + new id appears ──
    console.log('  • renumbering an existing handle is a violation...');
    {
        const next = parseReq([
            '- `IN1` Registration.',
            '- `IN9` Login.', // same text, renumbered IN2 → IN9
            '- `EX1` Social login.',
            '- `C1` TypeScript only.',
        ].join('\n'));
        const diff = diffReqHandles(BASE, next);
        assert(diff.ok === false, 'renumber is not ok');
        assert(diff.deleted.includes('IN2'), 'the vanished IN2 is reported');
        assert(diff.added.includes('IN9'), 'the fresh IN9 is reported as added');
        console.log('    ✅ renumber IN2→IN9 → flagged (IN2 deleted, IN9 added)');
    }

    console.log('\n✅ req-diff tests passed\n');
}

run().catch(e => { console.error('❌', e); process.exit(1); });
