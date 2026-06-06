import * as path from 'path';
import * as fs from 'fs-extra';
import * as os from 'os';
import { assert } from './test-utils.ts';
import { refinePlan } from '../packages/app/dist/refinePlan.js';
import { weavePlan } from '../packages/app/dist/index.js';
import { saveDoc, loadDoc, loadWeave } from '../packages/fs/dist/index.js';

const TMP = path.join(os.tmpdir(), 'loom-refine-plan-tests');

function stubClient(reply: string): any {
    return { complete: async () => reply };
}

async function makePlan(loomRoot: string, threadId: string): Promise<string> {
    const content = [
        '# P',
        '',
        '## Goal',
        'g',
        '',
        '## Steps',
        '| Done | # | Step | Files touched | Blocked by | Satisfies |',
        '|------|---|------|---------------|------------|-----------|',
        '| ✅ | 1 | Step one | a.ts | — | IN1 |',
        '| 🔳 | 2 | Step two | b.ts | — | IN2 |',
        '',
        '## Notes',
        '- x',
    ].join('\n');
    const planDeps: any = { loadWeave, saveDoc, loadDoc, fs, loomRoot };
    const { filePath } = await weavePlan(
        { weaveId: 'core-engine', threadId, title: 'P', content },
        planDeps,
    );
    return filePath;
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
        await refinePlan({ filePath: fp }, { loadDoc, saveDoc, aiClient: stubClient(reply) });
        const plan: any = await loadDoc(fp);
        const s1 = plan.steps.find((s: any) => s.order === 1);
        const s2 = plan.steps.find((s: any) => s.order === 2);
        assert(s1.done === true, `step 1 done preserved, got ${s1.done}`);
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
        await refinePlan({ filePath: fp }, { loadDoc, saveDoc, aiClient: stubClient(reply) });
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
        await refinePlan({ filePath: fp }, { loadDoc, saveDoc, aiClient: stubClient(reply) });
        const plan: any = await loadDoc(fp);
        assert(plan.steps.length === 2, `steps preserved, got ${plan.steps.length}`);
        assert(JSON.stringify(plan.steps[0].satisfies) === '["IN1"]', 'step 1 still IN1');
        console.log('    ✅ existing steps preserved on malformed reply');
    }

    await fs.remove(TMP);
    console.log('\n✅ refinePlan req-aware tests passed\n');
}

run().catch(e => { console.error('❌', e); process.exit(1); });
