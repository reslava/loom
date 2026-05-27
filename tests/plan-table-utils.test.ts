import { assert } from './test-utils.ts';
import { updateStepsTableInContent, parseStepsTable } from '../packages/core/dist/index.js';

const STEPS = [
    { order: 1, description: 'First step', done: true, files_touched: [], blockedBy: [] },
    { order: 2, description: 'Second step', done: false, files_touched: [], blockedBy: [] },
];

async function run() {
    console.log('🔁 Running planTableUtils tests...\n');

    // ── Regression: h3 section after the steps table must survive a save round-trip ──
    // Bug: updateStepsTableInContent's boundary lookahead stopped only at h1/h2 (or ---),
    // so an "### Notes" section right after the table (no preceding ---) was swallowed by
    // the lazy match and DELETED when the table was rewritten.
    console.log('  • h3 "### Notes" after the table is preserved on rewrite...');
    {
        const body = [
            '## Goal',
            '',
            'Do the thing.',
            '',
            '## Steps',
            '',
            '| Done | # | Step | Files touched | Blocked by |',
            '|---|---|---|---|---|',
            '| 🔳 | 1 | First step | — | — |',
            '| 🔳 | 2 | Second step | — | — |',
            '### Notes',
            '',
            '- An important note that must NOT be deleted.',
            '- Second note line.',
        ].join('\n');

        const updated = updateStepsTableInContent(body, STEPS);
        assert(updated.includes('### Notes'), '### Notes heading must survive');
        assert(updated.includes('An important note that must NOT be deleted.'), 'Notes content must survive');
        assert(updated.includes('Second note line.'), 'all Notes lines must survive');
        assert(updated.includes('| ✅ | 1 | First step'), 'step 1 must be marked done in the rewritten table');
        console.log('    ✅ Notes preserved + table updated');
    }

    // ── h3 after a --- (the canonical Legend case) still preserved ──
    console.log('  • "### Legend" after a --- separator is preserved...');
    {
        const body = [
            '## Steps',
            '',
            '| Done | # | Step | Files touched | Blocked by |',
            '|---|---|---|---|---|',
            '| 🔳 | 1 | First step | — | — |',
            '| 🔳 | 2 | Second step | — | — |',
            '',
            '---',
            '',
            '### Legend',
            '',
            '| ✅ | Done |',
        ].join('\n');

        const updated = updateStepsTableInContent(body, STEPS);
        assert(updated.includes('### Legend'), 'Legend must survive');
        assert(updated.includes('| ✅ | 1 | First step'), 'step 1 marked done');
        console.log('    ✅ Legend preserved');
    }

    // ── parseStepsTable ignores trailing h3 prose ──
    console.log('  • parseStepsTable ignores a trailing "### Notes" section...');
    {
        const body = [
            '## Steps',
            '',
            '| Done | # | Step | Files touched | Blocked by |',
            '|---|---|---|---|---|',
            '| ✅ | 1 | First step | — | — |',
            '| 🔳 | 2 | Second step | — | — |',
            '### Notes',
            '- not a table row',
        ].join('\n');
        const parsed = parseStepsTable(body);
        assert(parsed.length === 2, `expected 2 steps, got ${parsed.length}`);
        assert(parsed[0].done === true && parsed[1].done === false, 'done flags parsed correctly');
        console.log('    ✅ parsed exactly the 2 table rows');
    }

    console.log('\n✅ planTableUtils tests passed\n');
}

run().catch(e => { console.error('❌', e); process.exit(1); });
