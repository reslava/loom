import { assert } from './test-utils.ts';
import { updateStepsTableInContent, parseStepsTable, generateStepsTable } from '../packages/core/dist/index.js';

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

    // ── A literal pipe in a step description survives generate → parse ──
    // Bug: a description like "load: 'always' | 'by-request'" split on '|' and
    // spilled across columns, corrupting the row on the next table rewrite.
    console.log('  • a step description containing a literal | round-trips losslessly...');
    {
        const steps = [
            { order: 1, description: "Add `load: 'always' | 'by-request'` field", done: false, files_touched: [], blockedBy: [] },
            { order: 2, description: 'Plain step', done: true, files_touched: [], blockedBy: [] },
        ];
        const table = generateStepsTable(steps);
        assert(table.includes('\\|'), 'the literal pipe is escaped in the generated table');

        const body = `## Steps\n\n${table}\n`;
        const parsed = parseStepsTable(body);
        assert(parsed.length === 2, `expected 2 steps, got ${parsed.length}`);
        assert(
            parsed[0].description === "Add `load: 'always' | 'by-request'` field",
            `description must round-trip with its pipe intact, got: ${parsed[0].description}`,
        );
        assert(parsed[0].done === false && parsed[1].done === true, 'done flags survive the pipe-escaped row');
        console.log('    ✅ pipe-bearing description round-trips intact');
    }

    // ── A data row whose Files cell names "Done"/"Step" files is NOT a header ──
    // Bug: the header was detected by `line.includes('Done') && line.includes('Step')`,
    // which false-positived on any step whose Files cell listed files like appendDone.ts
    // ("Done") and doStep.ts ("Step") — silently dropping that whole step from the plan.
    console.log('  • a step row naming appendDone.ts / doStep.ts is not mistaken for the header...');
    {
        const body = [
            '## Steps',
            '',
            '| Done | # | Step | Files touched | Blocked by |',
            '|---|---|---|---|---|',
            '| 🔳 | 1 | Route read resources | packages/mcp/src/resources/docs.ts | — |',
            '| 🔳 | 2 | Route prompts | packages/mcp/src/prompts/doNextStep.ts | — |',
            '| 🔳 | 3 | Route tool ids | packages/mcp/src/tools/appendDone.ts, packages/mcp/src/tools/doStep.ts, packages/mcp/src/tools/listPlanSteps.ts | — |',
            '| 🔳 | 4 | Tests + build | tests/x.test.ts | — |',
        ].join('\n');
        const parsed = parseStepsTable(body);
        assert(parsed.length === 4, `expected 4 steps, got ${parsed.length} (orders ${parsed.map(s => s.order).join(',')})`);
        assert(parsed.some(s => s.order === 3), 'the appendDone.ts/doStep.ts step (order 3) must not be dropped');
        assert(
            parsed[2].files_touched.includes('packages/mcp/src/tools/doStep.ts'),
            'the tool step files must parse intact',
        );
        console.log('    ✅ tool-file step survives header detection');
    }

    console.log('\n✅ planTableUtils tests passed\n');
}

run().catch(e => { console.error('❌', e); process.exit(1); });
