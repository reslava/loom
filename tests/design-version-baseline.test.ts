import * as path from 'path';
import * as fs from 'fs-extra';
import * as os from 'os';
import { assert } from './test-utils.ts';
import { loadDoc, loadWeave, saveDoc } from '../packages/fs/dist/index.js';
import { isPlanStale } from '../packages/core/dist/index.js';
import { createPlan } from '../packages/app/dist/createPlan.js';
import { promoteToPlan } from '../packages/app/dist/promoteToPlan.js';
import { createThread } from '../packages/app/dist/thread.js';
import { refinePlan } from '../packages/app/dist/refinePlan.js';
import { backfillDesignVersions } from '../packages/app/dist/backfillDesignVersions.js';

// Regression suite for the design_version staleness baseline: create / promote / refine
// must stamp the parent design's LIVE version (not a constant 1, not undefined), and the
// backfill migration repairs plans already on disk with a wrong baseline.

const TMP = path.join(os.tmpdir(), 'loom-design-version-baseline-tests');
const WEAVE = 'core-engine';

function threadDir(root: string, threadSlug: string): string {
    return path.join(root, 'loom', WEAVE, threadSlug);
}

/** Write (or overwrite, to bump) a thread's design doc at the given version. */
async function writeDesign(root: string, threadSlug: string, version: number): Promise<string> {
    const dir = threadDir(root, threadSlug);
    await fs.ensureDir(dir);
    const id = `ds_${threadSlug}`;
    const doc: any = {
        type: 'design', id, title: 'D', status: 'active',
        created: '2026-06-01', version, tags: [], parent_id: null, requires_load: [],
        role: 'primary', target_release: null, actual_release: null,
        content: '# D\n\ndesign body',
    };
    await saveDoc(doc, path.join(dir, `${threadSlug}-design.md`));
    return id;
}

function planDeps(root: string): any {
    return { loadWeave, saveDoc, loadDoc, fs, loomRoot: root };
}

function stubClient(reply: string): any {
    return { complete: async () => reply };
}

async function run() {
    console.log('🔧 Running design_version baseline tests...\n');
    await fs.remove(TMP);
    const root = TMP;
    await fs.ensureDir(path.join(root, 'loom', WEAVE));

    // ── create_plan stamps the LIVE design version (not the constant 1) ──
    console.log('  • create_plan stamps the live design version...');
    const tcreateUlid = (await createThread({ weaveSlug: WEAVE, threadSlug: 'tcreate' }, { getActiveLoomRoot: () => root, saveDoc, fs })).id;
    const createDesignId = await writeDesign(root, 'tcreate', 3);
    const { filePath: createPath } = await createPlan(
        { weaveSlug: WEAVE, threadUlid: tcreateUlid, goal: 'g', steps: [{ description: 's1' }] },
        planDeps(root),
    );
    {
        const plan: any = await loadDoc(createPath);
        assert(plan.design_version === 3, `create stamps live design v3, got ${plan.design_version}`);
        assert(plan.parent_id === createDesignId, `plan parented to the design, got ${plan.parent_id}`);
        console.log('    ✅ born at design_version 3, parented to the design');
    }

    // ── bumping the design flags the plan stale (read side still correct) ──
    console.log('  • bumping the design flags the plan stale...');
    await writeDesign(root, 'tcreate', 4); // design moves on
    {
        const plan: any = await loadDoc(createPath);
        const design: any = await loadDoc(path.join(threadDir(root, 'tcreate'), 'tcreate-design.md'));
        assert(isPlanStale(plan, design) === true, 'plan is stale once design v4 > plan baseline v3');
        console.log('    ✅ stale detected (v3 < v4)');
    }

    // ── refine re-baselines design_version → clears the staleness it could never clear ──
    console.log('  • refine re-baselines design_version to current...');
    {
        const reply = [
            'TITLE: P', '', '## Goal', 'g', '',
            '## Steps',
            '| Done | # | Step | Files touched | Blocked by | Satisfies |',
            '|------|---|------|---------------|------------|-----------|',
            '| 🔳 | 1 | s1 | a.ts | — | — |', '',
            '## Notes', '- n',
        ].join('\n');
        await refinePlan({ filePath: createPath }, { loadDoc, saveDoc, aiClient: stubClient(reply), fs });
        const refined: any = await loadDoc(createPath);
        const design: any = await loadDoc(path.join(threadDir(root, 'tcreate'), 'tcreate-design.md'));
        assert(refined.design_version === 4, `refine re-baselines to v4, got ${refined.design_version}`);
        assert(isPlanStale(refined, design) === false, 'refined plan is no longer stale');
        console.log('    ✅ re-baselined to v4, staleness cleared');
    }

    // ── promote → plan stamps the live design version (was omitted → never stale) ──
    console.log('  • promote → plan stamps the live design version...');
    const tpromoteUlid = (await createThread({ weaveSlug: WEAVE, threadSlug: 'tpromote' }, { getActiveLoomRoot: () => root, saveDoc, fs })).id;
    await writeDesign(root, 'tpromote', 2);
    {
        const ideaPath = path.join(threadDir(root, 'tpromote'), 'tpromote-idea.md');
        await saveDoc({
            type: 'idea', id: 'id_tpromote', title: 'I', status: 'active',
            created: '2026-06-01', version: 1, tags: [], parent_id: null, requires_load: [],
            content: '# I\n\nidea body',
        } as any, ideaPath);

        const { filePath: promotedPath } = await promoteToPlan(
            { filePath: ideaPath, targetWeaveSlug: WEAVE, targetThreadUlid: tpromoteUlid, body: '## Goal\ng\n\n## Steps\n1. do a thing\n' },
            { loadDoc, saveDoc, fs, aiClient: stubClient(''), loomRoot: root },
        );
        const promoted: any = await loadDoc(promotedPath);
        assert(promoted.design_version === 2, `promote stamps live design v2, got ${promoted.design_version}`);
        console.log('    ✅ promoted plan born at design_version 2');
    }

    // ── backfill repairs a plan stuck at a wrong baseline; --dry-run writes nothing; idempotent ──
    console.log('  • backfill-design-versions repairs an on-disk plan...');
    await writeDesign(root, 'tbackfill', 5);
    const bfPlanPath = path.join(threadDir(root, 'tbackfill'), 'plans', 'tbackfill-plan-001.md');
    await fs.ensureDir(path.dirname(bfPlanPath));
    await saveDoc({
        type: 'plan', id: 'pl_bf', title: 'BF', status: 'active',
        created: '2026-06-01', version: 1, design_version: 1, target_version: '0.1.0',
        tags: [], parent_id: null, requires_load: [], _stepsFromFrontmatter: true,
        steps: [{ id: 's', order: 1, status: 'pending', title: 's', description: 's', files_touched: [], blockedBy: [], satisfies: [] }],
        content: '# BF\n\n## Goal\n\ng\n\n---\n\n## Steps\n\n(generated)\n\n## Notes\n- x',
    } as any, bfPlanPath);

    const bfDeps = { getActiveLoomRoot: () => root, saveDoc, loadDoc, fs } as any;
    {
        // dry-run reports the change but must not write
        const dry = await backfillDesignVersions({ dryRun: true }, bfDeps);
        assert(dry.changed.some((c: any) => c.from === 1 && c.to === 5), 'dry-run reports the 1 → 5 re-baseline');
        const untouched: any = await loadDoc(bfPlanPath);
        assert(untouched.design_version === 1, 'dry-run wrote nothing');

        // real run re-baselines to the current design version
        const real = await backfillDesignVersions({}, bfDeps);
        assert(real.changed.some((c: any) => c.to === 5), 'real run re-baselines the stuck plan');
        const fixed: any = await loadDoc(bfPlanPath);
        assert(fixed.design_version === 5, `backfill set design_version to 5, got ${fixed.design_version}`);

        // idempotent: every plan now matches its design, so a second run is a no-op
        const again = await backfillDesignVersions({}, bfDeps);
        assert(again.changed.length === 0, `backfill idempotent on second run, got ${again.changed.length} change(s)`);
        console.log('    ✅ dry-run safe, repair correct, idempotent');
    }

    await fs.remove(TMP);
    console.log('\n✅ design_version baseline tests passed\n');
}

run().catch(e => { console.error('❌', e); process.exit(1); });
