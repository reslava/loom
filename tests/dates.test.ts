import { assert } from './test-utils.ts';
import { today, nowIso, toEpoch, compareDates, toCanonical } from '../packages/core/dist';

// Pure unit tests for the core/dates.ts seam — no filesystem, no CLI. The whole
// point is that a date written one way and a date written another way still
// compare correctly, which is what fixes the roadmap History mis-ordering.

async function run() {
    console.log('📅  Running dates (core/dates.ts) tests...\n');

    // 1. today() is canonical YYYY-MM-DD.
    {
        assert(/^\d{4}-\d{2}-\d{2}$/.test(today()), 'today() is YYYY-MM-DD');
        console.log('  ✅ today() canonical shape');
    }

    // 2. nowIso() is a full ISO instant (carries time).
    {
        assert(/T\d{2}:\d{2}:\d{2}/.test(nowIso()), 'nowIso() carries a time component');
        console.log('  ✅ nowIso() full instant');
    }

    // 3. The core fix: date-only and full-ISO of the SAME day are equal under toEpoch.
    {
        assert(toEpoch('2026-06-16') === toEpoch('2026-06-16T00:00:00.000Z'),
            'date-only equals full-ISO midnight of the same day');
        console.log('  ✅ mixed formats, same day → equal epoch');
    }

    // 4. compareDates orders chronologically regardless of format, and never NaN.
    {
        assert(compareDates('2026-01-15', '2026-03-20T12:00:00.000Z') < 0, 'earlier date sorts first across formats');
        assert(compareDates('2026-03-20T12:00:00.000Z', '2026-01-15') > 0, 'later date sorts after across formats');
        assert(compareDates('2026-06-16', '2026-06-16') === 0, 'identical dates are equal');
        console.log('  ✅ compareDates chronological across formats');
    }

    // 5. The original History bug: a bare-date done-doc vs a full-ISO date on the
    //    SAME day must NOT mis-order (the raw string compare put the bare date first).
    {
        // Newest-first sort, as buildHistory does: compareDates(b, a).
        const items = ['2026-06-16', '2026-06-16T00:00:00.000Z'];
        const sorted = [...items].sort((a, b) => compareDates(b, a));
        // Equal day → stable order preserved (no spurious flip on format alone).
        assert(compareDates(sorted[0], sorted[1]) === 0, 'same-day mixed-format entries compare equal (no format flip)');
        console.log('  ✅ regression: same-day mixed-format does not mis-order');
    }

    // 6. Empty / unparseable → -Infinity (sorts oldest); compareDates stays defined.
    {
        assert(toEpoch('') === -Infinity, 'empty string → -Infinity');
        assert(toEpoch(undefined) === -Infinity, 'undefined → -Infinity');
        assert(toEpoch('not-a-date') === -Infinity, 'garbage → -Infinity');
        assert(compareDates('', '') === 0, 'two empties compare equal (not NaN)');
        assert(compareDates('2026-01-01', '') > 0, 'a real date is newer than an empty one');
        console.log('  ✅ empty/unparseable sentinel (-Infinity), no NaN');
    }

    // 7. toCanonical: normalizes ISO → date-only, idempotent, leaves garbage untouched.
    {
        assert(toCanonical('2026-06-16T00:00:00.000Z') === '2026-06-16', 'full-ISO → date-only');
        assert(toCanonical('2026-06-16') === '2026-06-16', 'already-canonical unchanged (idempotent)');
        assert(toCanonical(toCanonical('2026-06-16T09:30:00.000Z')) === '2026-06-16', 'double-apply idempotent');
        assert(toCanonical('') === '', 'empty returned untouched');
        assert(toCanonical(undefined) === undefined, 'undefined returned untouched');
        assert(toCanonical('not-a-date') === 'not-a-date', 'unparseable returned untouched (not corrupted)');
        console.log('  ✅ toCanonical normalize + idempotent + safe');
    }

    console.log('\n✅ All dates tests passed');
}

run().catch(e => { console.error('❌ dates test failed:', e); process.exit(1); });
