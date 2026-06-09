import * as path from 'path';
import * as os from 'os';
import * as fs from 'fs-extra';
import { assert } from './test-utils.ts';
import { migratePlanSteps } from '../packages/app/dist/migratePlanSteps.js';
import { loadDoc, saveDoc } from '../packages/fs/dist/index.js';

const TMP = path.join(os.tmpdir(), `loom-migrate-steps-${Date.now()}`);

function fm(id: string): string[] {
    return [
        '---', 'type: plan', `id: ${id}`, 'title: T', 'status: implementing',
        'created: "2026-06-09T00:00:00.000Z"', 'version: 1', 'tags: []',
        'parent_id: null', 'requires_load: []', 'target_version: 0.1.0', '---',
    ];
}

async function run() {
    console.log('🔁 Running migrate-plan-steps tests...\n');
    const threadPlans = path.join(TMP, 'loom', 'w', 't', 'plans');
    await fs.ensureDir(threadPlans);

    // Legacy plan: canonical body table, no frontmatter steps.
    const legacyFp = path.join(threadPlans, 'legacy-plan-001.md');
    await fs.writeFile(legacyFp, [
        ...fm('legacy-plan-001'),
        '# T', '', '## Steps', '',
        '| Done | # | Step | Files touched | Blocked by | Satisfies |',
        '|---|---|---|---|---|---|',
        '| ✅ | 1 | First | a.ts | — | IN1 |',
        '| 🔳 | 2 | Second | b.ts | 1 | — |',
    ].join('\n'));

    // Native plan: already has a frontmatter steps block (saved frontmatter-native).
    const nativeFp = path.join(threadPlans, 'native-plan-001.md');
    await saveDoc({
        type: 'plan', id: 'native-plan-001', title: 'T', status: 'implementing',
        created: '2026-06-09T00:00:00.000Z', version: 1, tags: [], parent_id: null,
        requires_load: [], target_version: '0.1.0', _stepsFromFrontmatter: true,
        steps: [{ id: 'a', order: 1, status: 'pending', title: 'A', description: 'A', files_touched: [], blockedBy: [], satisfies: [] }],
        content: '# T\n\n## Goal\n\ng\n',
    } as any, nativeFp);

    // Unparseable plan: a foreign column layout the parser cannot read.
    const badFp = path.join(threadPlans, 'bad-plan-001.md');
    const badBody = [
        ...fm('bad-plan-001'),
        '# T', '', '## Steps', '',
        '| # | Step | Status | Notes |',
        '|---|------|--------|-------|',
        '| 1 | do thing | done | x |',
    ].join('\n');
    await fs.writeFile(badFp, badBody);

    const deps = { loadDoc, saveDoc, fs };

    // ── Dry-run: reports, writes nothing ──
    console.log('  • dry-run reports correctly and writes nothing...');
    {
        const before = await fs.readFile(legacyFp, 'utf8');
        const results = await migratePlanSteps({ loomRoot: TMP, dryRun: true }, deps);
        const byId = Object.fromEntries(results.map(r => [r.planId, r.status]));
        assert(byId['legacy-plan-001'] === 'migrated', `legacy → migrated, got ${byId['legacy-plan-001']}`);
        assert(byId['native-plan-001'] === 'already-native', `native → already-native, got ${byId['native-plan-001']}`);
        assert(byId['bad-plan-001'] === 'unparseable', `bad → unparseable, got ${byId['bad-plan-001']}`);
        const after = await fs.readFile(legacyFp, 'utf8');
        assert(before === after, 'dry-run must not modify the legacy file');
        console.log('    ✅ dry-run classifies legacy/native/unparseable and writes nothing');
    }

    // ── Apply: legacy becomes frontmatter-native; bad untouched ──
    console.log('  • apply migrates legacy → frontmatter, leaves unparseable untouched...');
    {
        const badBefore = await fs.readFile(badFp, 'utf8');
        const results = await migratePlanSteps({ loomRoot: TMP }, deps);
        assert(results.find(r => r.planId === 'legacy-plan-001')?.status === 'migrated', 'legacy migrated on apply');

        const migrated = await fs.readFile(legacyFp, 'utf8');
        assert(migrated.includes('\nsteps:\n'), 'legacy file now has a frontmatter steps block');
        const reloaded: any = await loadDoc(legacyFp);
        assert(reloaded._stepsFromFrontmatter === true, 'migrated plan loads frontmatter-native');
        assert(reloaded.steps.length === 2 && reloaded.steps[0].status === 'done', 'steps + status preserved through migration');
        assert(JSON.stringify(reloaded.steps[1].blockedBy) === JSON.stringify(['1']), 'blocker (ordinal) preserved');

        const badAfter = await fs.readFile(badFp, 'utf8');
        assert(badBefore === badAfter, 'unparseable plan left byte-identical (never emptied)');
        console.log('    ✅ legacy migrated; unparseable left exactly as-is');
    }

    // ── Idempotent: a second run finds nothing left to migrate ──
    console.log('  • re-running is idempotent...');
    {
        const results = await migratePlanSteps({ loomRoot: TMP }, deps);
        assert(results.find(r => r.planId === 'legacy-plan-001')?.status === 'already-native', 'legacy now already-native');
        console.log('    ✅ idempotent on re-run');
    }

    await fs.remove(TMP).catch(() => {});
    console.log('\n✅ migrate-plan-steps tests passed\n');
}

run().catch(e => { console.error('❌ migrate-plan-steps.test.ts failed:', e); process.exit(1); });
