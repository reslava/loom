import * as path from 'path';
import * as fs from 'fs-extra';
import * as os from 'os';
import { assert } from './test-utils.ts';
import { refinePlan } from '../packages/app/dist/refinePlan.js';
import { saveDoc, loadDoc } from '../packages/fs/dist/index.js';

const TMP = path.join(os.tmpdir(), 'loom-refine-plan-tests');

function stubClient(reply: string): any {
    return { complete: async () => reply };
}

// Build a frontmatter-native plan fixture: step 1 done (IN1), step 2 pending (IN2).
async function makePlan(loomRoot: string, threadSlug: string): Promise<string> {
    const plansDir = path.join(loomRoot, 'loom', 'core-engine', threadSlug, 'plans');
    await fs.ensureDir(plansDir);
    const fp = path.join(plansDir, `${threadSlug}-plan-001.md`);
    const doc: any = {
        type: 'plan', id: `${threadSlug}-plan-001`, title: 'P', status: 'implementing',
        created: '2026-06-09T00:00:00.000Z', version: 1, design_version: 1, tags: [],
        parent_id: null, requires_load: [], target_version: '0.1.0',
        _stepsFromFrontmatter: true,
        steps: [
            { id: 'step-one', order: 1, status: 'done', title: 'Step one', description: 'Step one', files_touched: ['a.ts'], blockedBy: [], satisfies: ['IN1'] },
            { id: 'step-two', order: 2, status: 'pending', title: 'Step two', description: 'Step two', files_touched: ['b.ts'], blockedBy: [], satisfies: ['IN2'] },
        ],
        content: '# P\n\n## Goal\n\ng\n\n---\n\n## Steps\n\n(generated)\n\n## Notes\n- x',
    };
    await saveDoc(doc, fp);
    return fp;
}

async function run() {
    console.log('🔧 Running refinePlan req-aware tests...\n');
    await fs.remove(TMP);
    const loomRoot = TMP;
    await fs.ensureDir(path.join(loomRoot, 'loom', 'core-engine'));

    // ── Case A: a 5-column AI reply must NOT strip citations or flip done ──
    console.log('  • refine with a 5-col reply preserves Satisfies + done status...');
    {
        const fp = await makePlan(loomRoot, 'reg');
        const reply = [
            'TITLE: P refined',
            '',
            '## Goal',
            'g2',
            '',
            '## Steps',
            '| Done | # | Step | Files touched | Blocked by |',
            '|------|---|------|---------------|------------|',
            '| 🔳 | 1 | Step one refined | a.ts | — |',  // AI drops Satisfies AND flips done off
            '| 🔳 | 2 | Step two refined | b.ts | — |',
            '',
            '## Notes',
            '- n',
        ].join('\n');
        await refinePlan({ filePath: fp }, { loadDoc, saveDoc, aiClient: stubClient(reply), fs });
        const plan: any = await loadDoc(fp);
        const s1 = plan.steps.find((s: any) => s.order === 1);
        const s2 = plan.steps.find((s: any) => s.order === 2);
        assert(s1.status === 'done', `step 1 done preserved, got ${s1.status}`);
        assert(JSON.stringify(s1.satisfies) === '["IN1"]', `step 1 keeps IN1, got ${JSON.stringify(s1.satisfies)}`);
        assert(JSON.stringify(s2.satisfies) === '["IN2"]', `step 2 keeps IN2, got ${JSON.stringify(s2.satisfies)}`);
        assert(s1.description === 'Step one refined', 'step 1 description was refined');
        // The refined citations must survive to the on-disk table, not just memory.
        assert(plan.content.includes('IN1') && plan.content.includes('IN2'), 'on-disk table carries citations');
        console.log('    ✅ citations + done preserved through a lossy reply');
    }

    // ── Case B: a 6-column reply emits/updates citations ──
    console.log('  • refine with a 6-col reply emits new Satisfies ids...');
    {
        const fp = await makePlan(loomRoot, 'emit');
        const reply = [
            'TITLE: P refined',
            '',
            '## Goal',
            'g2',
            '',
            '## Steps',
            '| Done | # | Step | Files touched | Blocked by | Satisfies |',
            '|------|---|------|---------------|------------|-----------|',
            '| ✅ | 1 | Step one | a.ts | — | IN1 |',
            '| 🔳 | 2 | Step two | b.ts | — | IN3 |',  // AI re-cites step 2 to IN3
            '',
            '## Notes',
            '- n',
        ].join('\n');
        await refinePlan({ filePath: fp }, { loadDoc, saveDoc, aiClient: stubClient(reply), fs });
        const plan: any = await loadDoc(fp);
        const s2 = plan.steps.find((s: any) => s.order === 2);
        assert(JSON.stringify(s2.satisfies) === '["IN3"]', `step 2 re-cited to IN3, got ${JSON.stringify(s2.satisfies)}`);
        console.log('    ✅ AI-supplied citations take effect');
    }

    // ── Case C: a malformed (tableless) reply must not wipe the steps ──
    console.log('  • refine with a tableless reply keeps existing steps...');
    {
        const fp = await makePlan(loomRoot, 'safe');
        const reply = 'TITLE: P\n\n## Goal\ng\n\n## Notes\n- no table here';
        await refinePlan({ filePath: fp }, { loadDoc, saveDoc, aiClient: stubClient(reply), fs });
        const plan: any = await loadDoc(fp);
        assert(plan.steps.length === 2, `steps preserved, got ${plan.steps.length}`);
        assert(JSON.stringify(plan.steps[0].satisfies) === '["IN1"]', 'step 1 still IN1');
        console.log('    ✅ existing steps preserved on malformed reply');
    }

    await fs.remove(TMP);
    console.log('\n✅ refinePlan req-aware tests passed\n');
}

run().catch(e => { console.error('❌', e); process.exit(1); });
