import { assert } from './test-utils.ts';
import * as os from 'os';
import * as path from 'path';
import * as fs from 'fs-extra';
import { saveDoc, loadDoc } from '../packages/fs/dist/index.js';

async function run() {
    console.log('🔁 Running plan frontmatter-steps round-trip tests...\n');
    const dir = path.join(os.tmpdir(), `loom-fm-steps-${Date.now()}`);
    await fs.ensureDir(dir);

    // ── 1. Frontmatter-native plan: steps persist to frontmatter; body prose preserved ──
    console.log('  • frontmatter-native plan: steps → frontmatter block, prose preserved...');
    {
        const fp = path.join(dir, 'p-plan-001.md');
        const steps = [
            { id: 'first', order: 1, status: 'done', title: 'First', description: 'First step', files_touched: ['a.ts', 'b.ts'], blockedBy: [], satisfies: ['IN1'] },
            { id: 'second', order: 2, status: 'pending', title: 'Second', description: 'Second | piped: yes', files_touched: [], blockedBy: ['first'], satisfies: [] },
        ];
        const body = [
            '# P', '', '## Goal', '', 'Some goal prose.', '', '---', '',
            '## Steps', '',
            '| Done | # | Step | Files touched | Blocked by | Satisfies |',
            '|---|---|---|---|---|---|',
            '| 🔳 | 1 | stale row | — | — | — |',
            '', '---', '', '### Legend', '', '| ✅ | Done |', '',
            '### Step 1 — First', '', '- detail bullet that must survive', '',
            '## Notes', '', '- note prose that must survive',
        ].join('\n');
        const doc: any = {
            type: 'plan', id: 'p-plan-001', title: 'P', status: 'implementing',
            created: '2026-06-09T00:00:00.000Z', version: 1, tags: [], parent_id: null, requires_load: [],
            target_version: '0.1.0', steps, content: body, _stepsFromFrontmatter: true,
        };

        await saveDoc(doc, fp);
        const saved1 = await fs.readFile(fp, 'utf8');
        assert(saved1.includes('\nsteps:\n'), 'frontmatter contains a steps: block');
        assert(saved1.includes('blocked_by: [first]'), 'blockedBy serialized as snake_case blocked_by');
        assert(saved1.includes('"Second | piped: yes"'), 'description with colon is quoted');
        assert(saved1.includes('- detail bullet that must survive'), 'authored ### Step detail prose preserved');
        assert(saved1.includes('Some goal prose.'), 'Goal prose preserved');
        assert(saved1.includes('- note prose that must survive'), 'Notes prose preserved');
        assert(saved1.includes('| ✅ | 1 | First step'), 'body table regenerated from frontmatter steps');
        assert(!saved1.includes('stale row'), 'stale body table row replaced by the generated view');

        const loaded: any = await loadDoc(fp);
        assert(loaded._stepsFromFrontmatter === true, 'loaded plan is frontmatter-native');
        assert(loaded.steps.length === 2, `expected 2 steps, got ${loaded.steps.length}`);
        assert(loaded.steps[0].id === 'first' && loaded.steps[0].status === 'done', 'step 1 id+status round-trip');
        assert(JSON.stringify(loaded.steps[0].files_touched) === JSON.stringify(['a.ts', 'b.ts']), 'files_touched round-trip');
        assert(loaded.steps[1].description === 'Second | piped: yes', `description round-trip, got ${loaded.steps[1].description}`);
        assert(JSON.stringify(loaded.steps[1].blockedBy) === JSON.stringify(['first']), 'blocked_by → blockedBy round-trip');
        assert(JSON.stringify(loaded.steps[0].satisfies) === JSON.stringify(['IN1']), 'satisfies round-trip');
        console.log('    ✅ steps persisted to frontmatter; body prose + generated table correct');

        // ── 2. Byte-stable save → load → save ──
        console.log('  • save → load → save is byte-stable...');
        await saveDoc(loaded, fp);
        const saved2 = await fs.readFile(fp, 'utf8');
        assert(saved1 === saved2, 'second save is byte-identical to the first');
        console.log('    ✅ byte-stable round-trip');
    }

    // ── 3. Legacy plan (no frontmatter steps): body-parse fallback, not auto-migrated ──
    console.log('  • legacy plan loads via body fallback and is NOT migrated on save...');
    {
        const fp = path.join(dir, 'legacy-plan-001.md');
        const legacy = [
            '---',
            'type: plan',
            'id: legacy-plan-001',
            'title: Legacy',
            'status: implementing',
            'created: 2026-06-09',
            'version: 1',
            'tags: []',
            'parent_id: null',
            'requires_load: []',
            'target_version: 0.1.0',
            '---',
            '# Legacy', '', '## Steps', '',
            '| Done | # | Step | Files touched | Blocked by | Satisfies |',
            '|---|---|---|---|---|---|',
            '| 🔳 | 1 | Legacy step | src/x.ts | — | — |',
        ].join('\n');
        await fs.writeFile(fp, legacy);

        const loaded: any = await loadDoc(fp);
        assert(loaded._stepsFromFrontmatter === false, 'legacy plan is NOT frontmatter-native');
        assert(loaded.steps.length === 1 && loaded.steps[0].description === 'Legacy step', 'legacy body table still parses');

        await saveDoc(loaded, fp);
        const resaved = await fs.readFile(fp, 'utf8');
        const frontmatterBlock = resaved.split('---')[1] ?? '';
        assert(!frontmatterBlock.includes('steps:'), 'saving a legacy plan does NOT write a frontmatter steps block (no implicit migration)');
        assert(resaved.includes('| 🔳 | 1 | Legacy step'), 'legacy body table preserved on save');
        console.log('    ✅ legacy plan stays body-only until the explicit migration command');
    }

    // ── 4. Special chars in array fields must serialize as valid YAML flow items ──
    // Regression: a files_touched / satisfies entry carrying ": ", commas, brackets, or
    // backticks (e.g. prose lifted from a legacy "Files touched" cell) produced an invalid
    // inline [a, b] sequence and broke the very next load.
    console.log('  • special chars in array fields round-trip (flow-item quoting)...');
    {
        const fp = path.join(dir, 's-plan-001.md');
        const messy = '`packages/core/src/derived.ts` (computed once per getState: see note), other.ts';
        const doc: any = {
            type: 'plan', id: 's-plan-001', title: 'S', status: 'implementing',
            created: '2026-06-09T00:00:00.000Z', version: 1, tags: [], parent_id: null,
            requires_load: [], target_version: '0.1.0', _stepsFromFrontmatter: true,
            // description STARTS with a backtick — a reserved YAML indicator, must be quoted.
            steps: [{ id: 's1', order: 1, status: 'pending', title: 'S1', description: '`app/promoteToDesign` use-case — drafts a design', files_touched: [messy, 'b.ts'], blockedBy: [], satisfies: ['IN1, IN2', 'C1'] }],
            content: '# S\n\n## Goal\n\ng\n',
        };
        await saveDoc(doc, fp);
        const loaded: any = await loadDoc(fp); // must not throw a YAML parse error
        assert(loaded.steps[0].description === '`app/promoteToDesign` use-case — drafts a design', `backtick-leading description round-trips, got ${loaded.steps[0].description}`);
        assert(loaded.steps[0].files_touched[0] === messy, `messy files entry round-trips verbatim, got ${loaded.steps[0].files_touched[0]}`);
        assert(JSON.stringify(loaded.steps[0].satisfies) === JSON.stringify(['IN1, IN2', 'C1']), 'satisfies with a comma round-trips as one item');
        console.log('    ✅ flow-unsafe array items are quoted and parse back intact');
    }

    await fs.remove(dir).catch(() => {});
    console.log('\n✅ plan frontmatter-steps tests passed\n');
}

run().catch(e => { console.error('❌ plan-frontmatter-steps.test.ts failed:', e); process.exit(1); });
