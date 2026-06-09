import { assert } from './test-utils.ts';
import { updateStepsTableInContent, parseStepsTable, generateStepsTable, serializePlanBody } from '../packages/core/dist/index.js';

const STEPS = [
    { order: 1, description: 'First step', status: 'done', files_touched: [], blockedBy: [] },
    { order: 2, description: 'Second step', status: 'pending', files_touched: [], blockedBy: [] },
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
        assert(parsed[0].status === 'done' && parsed[1].status === 'pending', 'done flags parsed correctly');
        console.log('    ✅ parsed exactly the 2 table rows');
    }

    // ── A literal pipe in a step description survives generate → parse ──
    // Bug: a description like "load: 'always' | 'by-request'" split on '|' and
    // spilled across columns, corrupting the row on the next table rewrite.
    console.log('  • a step description containing a literal | round-trips losslessly...');
    {
        const steps = [
            { order: 1, description: "Add `load: 'always' | 'by-request'` field", status: 'pending', files_touched: [], blockedBy: [] },
            { order: 2, description: 'Plain step', status: 'done', files_touched: [], blockedBy: [] },
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
        assert(parsed[0].status === 'pending' && parsed[1].status === 'done', 'done flags survive the pipe-escaped row');
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

    // ── Satisfies column round-trips; legacy 5-column tables parse as [] ──
    console.log('  • Satisfies column round-trips; legacy 5-col table → satisfies []...');
    {
        const steps = [
            { order: 1, description: 'Cite step', status: 'pending', files_touched: ['a.ts'], blockedBy: [], satisfies: ['IN1', 'C2'] },
            { order: 2, description: 'No cite', status: 'done', files_touched: [], blockedBy: [], satisfies: [] },
        ];
        const table = generateStepsTable(steps);
        assert(table.includes('| Done | # | Step | Files touched | Blocked by | Satisfies |'), '6-column header expected');

        const parsed = parseStepsTable(`## Steps\n\n${table}\n`);
        assert(parsed.length === 2, `expected 2 steps, got ${parsed.length}`);
        assert(
            JSON.stringify(parsed[0].satisfies) === JSON.stringify(['IN1', 'C2']),
            `satisfies must round-trip, got ${JSON.stringify(parsed[0].satisfies)}`,
        );
        assert(parsed[1].satisfies.length === 0, 'empty satisfies parses back to []');

        // A legacy 5-column table (no Satisfies column) must still parse, satisfies → [].
        const legacy = [
            '## Steps',
            '',
            '| Done | # | Step | Files touched | Blocked by |',
            '|---|---|---|---|---|',
            '| ✅ | 1 | Legacy step | src/ | — |',
        ].join('\n');
        const legacyParsed = parseStepsTable(legacy);
        assert(legacyParsed.length === 1, 'legacy table parses to 1 step');
        assert(legacyParsed[0].satisfies.length === 0, 'legacy step → satisfies []');
        assert(legacyParsed[0].blockedBy.length === 0 && legacyParsed[0].status === 'done', 'legacy columns still parse');
        console.log('    ✅ Satisfies round-trips; legacy tables default to []');
    }

    // ── Data-loss guard: empty steps must NOT wipe a populated (even legacy-format) table ──
    // Bug this guards: a doc migration ran parseStepsTable on a foreign column format
    // (`| # | Step | Status | Notes |`), got [] (unparseable), then updateStepsTableInContent
    // overwrote the real table with an empty one — silently emptying shipped plans.
    console.log('  • empty steps do not wipe a populated table (legacy format included)...');
    {
        const legacyBody = [
            '# Plan',
            '',
            '## Steps',
            '',
            '| # | Step | Status | Notes |',
            '|---|------|--------|-------|',
            '| 1 | Build the thing | ✅ | done |',
            '| 2 | Test the thing | ✅ | done |',
        ].join('\n');
        const guarded = updateStepsTableInContent(legacyBody, []);
        assert(guarded === legacyBody, 'a foreign/legacy populated table must be left untouched when steps is empty');
        assert(guarded.includes('Build the thing'), 'legacy rows must survive');

        // But a genuinely empty Steps section CAN still receive a table (no guard).
        const emptyBody = '# Plan\n\n## Steps\n';
        const filled = updateStepsTableInContent(emptyBody, STEPS);
        assert(filled.includes('| ✅ | 1 | First step'), 'an empty Steps section still gets the new table');
        console.log('    ✅ populated table preserved; empty section still fillable');
    }

    // ── Invariant: serializePlanBody → parseStepsTable round-trips the table fields ──
    // The single serializer and the parser must agree. id/title/detail are NOT table
    // columns (they live in frontmatter post-flip), so the round-trip is over the
    // table-carried fields: order, status, description, files_touched, blockedBy, satisfies.
    console.log('  • serializePlanBody → parseStepsTable round-trips table-carried fields...');
    {
        const steps = [
            { id: 'a', order: 1, status: 'done', title: 'T1', description: 'First | piped step', files_touched: ['a.ts', 'b.ts'], blockedBy: [], satisfies: ['IN1'], detail: 'Do step A.' },
            { id: 'b', order: 2, status: 'in_progress', title: 'T2', description: 'Second', files_touched: [], blockedBy: ['a'], satisfies: [], detail: 'Do step B.' },
            { id: 'c', order: 3, status: 'pending', title: 'T3', description: 'Third', files_touched: [], blockedBy: [], satisfies: [] },
        ];
        const body = serializePlanBody(steps, { goal: 'Test goal paragraph.' });
        const parsed = parseStepsTable(body);
        assert(parsed.length === 3, `expected 3 steps, got ${parsed.length}`);
        for (let i = 0; i < steps.length; i++) {
            assert(parsed[i].order === steps[i].order, `order[${i}] mismatch`);
            assert(parsed[i].status === steps[i].status, `status[${i}] mismatch: got ${parsed[i].status}`);
            assert(parsed[i].description === steps[i].description, `description[${i}] mismatch: got ${parsed[i].description}`);
            assert(JSON.stringify(parsed[i].files_touched) === JSON.stringify(steps[i].files_touched), `files_touched[${i}] mismatch`);
            assert(JSON.stringify(parsed[i].blockedBy) === JSON.stringify(steps[i].blockedBy), `blockedBy[${i}] mismatch`);
            assert(JSON.stringify(parsed[i].satisfies) === JSON.stringify(steps[i].satisfies), `satisfies[${i}] mismatch`);
        }
        // The serializer emits Goal + Legend + per-step detail sections.
        assert(body.includes('## Goal') && body.includes('Test goal paragraph.'), 'goal section present');
        assert(body.includes('### Legend'), 'legend present');
        assert(body.includes('### Step 1 — T1') && body.includes('Do step A.'), 'detail section rendered');
        console.log('    ✅ round-trip holds; goal/legend/detail sections render');
    }

    console.log('\n✅ planTableUtils tests passed\n');
}

run().catch(e => { console.error('❌', e); process.exit(1); });
