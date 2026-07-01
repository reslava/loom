import * as path from 'path';
import { ensureDir, pathExists, remove, readdir } from 'fs-extra';
import { assert, mockAIClient } from './test-utils.ts';
import { setupWorkspace, seedWeaveWithThread, seedThread, seedLooseFiber, seedDoneInThread, fileExists, readFile } from './workspace-utils.ts';
import { loadWeave, saveDocs, saveDoc } from '../packages/fs/dist/index.js';
import { completeStep } from '../packages/app/dist/completeStep.js';
import { closePlan } from '../packages/app/dist/closePlan.js';
import { doStep } from '../packages/app/dist/doStep.js';
import { runEvent } from '../packages/app/dist/runEvent.js';

const fsDeps = {
    ensureDir,
    pathExists,
    remove,
    readdir,
} as any;

function makeRunEvent(loomRoot: string) {
    return (weaveId: string, event: any) =>
        runEvent(weaveId, event, { loadWeave: loadWeave as any, saveDocs, loomRoot });
}

function makeLoadWeave(loomRoot: string) {
    return async (root: string, id: string) => {
        const w = await loadWeave(root, id);
        if (!w) throw new Error(`Weave '${id}' not found in '${root}'`);
        return w;
    };
}

async function testWorkspaceWorkflow() {
    console.log('🏗️  Running workspace-workflow tests (j:/temp/loom)...\n');

    // ── test 1: loadWeave surfaces thread + plan from seeded workspace ────────
    console.log('  • loadWeave: thread and plan loaded from real workspace...');
    {
        const loomRoot = await setupWorkspace();
        const { planId } = await seedWeaveWithThread(loomRoot, 'ww-weave1', 'feature-a');

        const weave = await loadWeave(loomRoot, 'ww-weave1');
        assert(weave !== null, 'weave must load');
        assert(weave!.threads.length === 1, `expected 1 thread, got ${weave!.threads.length}`);
        assert(weave!.threads[0].design !== undefined, 'thread must have a design');
        assert(weave!.threads[0].plans.length === 1, 'thread must have 1 plan');
        assert(weave!.threads[0].plans[0].id === planId, 'plan id must match');
        console.log('    ✅ loadWeave surfaces thread + plan');
    }

    // ── test 2: completeStep marks step done; last step auto-closes plan ──────
    console.log('  • completeStep: step marked done; all steps done → autoCompleted...');
    {
        const loomRoot = await setupWorkspace();
        const { planId } = await seedWeaveWithThread(loomRoot, 'ww-weave2', 'feature-b', { steps: 2 });

        const deps = {
            loadWeave: makeLoadWeave(loomRoot),
            runEvent: makeRunEvent(loomRoot),
            loomRoot,
        };

        const r1 = await completeStep({ planId, step: 1 }, deps);
        assert(r1.autoCompleted === false, 'step 1 must not auto-complete plan');
        assert(r1.plan.steps[0].status === 'done', 'step 1 must be marked done');

        const r2 = await completeStep({ planId, step: 2 }, deps);
        assert(r2.autoCompleted === true, 'all steps done must auto-complete plan');
        assert(r2.plan.status === 'done', 'plan status must be done after auto-complete');
        console.log('    ✅ completeStep + auto-complete works');
    }

    // ── test 3: closePlan — thread layout: done doc in thread/done/, plan updated in place ─
    console.log('  • closePlan: thread layout — done doc in thread/done/, plan stays in plans/...');
    {
        const loomRoot = await setupWorkspace();
        const { threadPath, planId } = await seedWeaveWithThread(loomRoot, 'ww-weave3', 'feature-c', { planStatus: 'done' });

        await closePlan(
            { planId, notes: 'Workspace closing note.' },
            {
                loadWeave: makeLoadWeave(loomRoot),
                saveDoc,
                fs: fsDeps,
                loomRoot,
            }
        );

        // New scheme: done filename humanises to plan-NNN-done.md (mirrors the plan's ordinal).
        const doneOrd = planId.match(/-plan-(\d+)$/)?.[1] ?? '001';
        const doneDoneDoc = path.join(threadPath, 'done', `plan-${doneOrd}-done.md`);
        const planInPlace = path.join(threadPath, 'plans', `${planId}.md`);

        assert(fileExists(doneDoneDoc), 'done doc must exist at thread/done/plan-NNN-done.md');
        assert(fileExists(planInPlace), 'plan must remain at thread/plans/{planId}.md');

        const doneContent = readFile(doneDoneDoc);
        assert(doneContent.includes('type: done'), 'done doc must have type: done');
        assert(doneContent.includes(`parent_id: ${planId}`), 'done doc must link to plan');
        assert(doneContent.includes('Workspace closing note.'), 'verbatim notes must appear in done doc');

        const planContent = readFile(planInPlace);
        assert(planContent.includes('status: done'), 'plan must have status: done');
        console.log('    ✅ closePlan thread layout correct');
    }

    // ── test 4: doStep — chat doc created in weave chats/ dir ───────────────
    console.log('  • doStep: chat doc created in chats/ with correct structure...');
    {
        const loomRoot = await setupWorkspace();
        const { planId } = await seedWeaveWithThread(loomRoot, 'ww-weave4', 'feature-d');

        const result = await doStep(
            { planId, steps: [1] },
            {
                loadWeave: makeLoadWeave(loomRoot),
                saveDoc,
                fs: fsDeps,
                aiClient: mockAIClient('Do this and that.') as any,
                loomRoot,
            }
        );

        assert(fileExists(result.chatPath), 'chat doc must exist');
        assert(result.chatPath.includes('chats'), 'chat must be in chats/ dir');
        const content = readFile(result.chatPath);
        assert(/^# .+/m.test(content), 'chat doc must have an H1 title (synced from frontmatter)');
        assert(content.includes('## User:'), 'chat doc must have user (## User:) section');
        assert(content.includes('## AI:'), 'chat doc must have ## AI: section');
        assert(content.includes('Do this and that.'), 'AI response must appear in chat doc');
        assert(content.includes(`parent_id: ${planId}`), 'parent_id must link to plan');
        console.log('    ✅ doStep creates chat doc in chats/ correctly');
    }

    // ── test 5 (data layer): loadWeave after full workflow ───────────────────
    console.log('  • data layer: loadWeave surfaces threads, dones, chats after full workflow...');
    {
        const loomRoot = await setupWorkspace();
        const { planId } = await seedWeaveWithThread(loomRoot, 'ww-weave5', 'feature-e', { planStatus: 'implementing', steps: 1 });

        const loadW = makeLoadWeave(loomRoot);

        await doStep(
            { planId, steps: [1] },
            { loadWeave: loadW, saveDoc, fs: fsDeps, aiClient: mockAIClient('Step guidance.') as any, loomRoot }
        );

        await closePlan(
            { planId, notes: 'Done summary.' },
            { loadWeave: loadW, saveDoc, fs: fsDeps, loomRoot }
        );

        const weave = await loadWeave(loomRoot, 'ww-weave5');
        assert(weave !== null, 'weave must load');
        assert(weave!.chats.length >= 1, 'weave must surface chat doc from chats/');
        assert(weave!.threads.length === 1, 'must have 1 thread');
        assert(weave!.threads[0].dones.length === 1, 'thread must surface done doc');
        assert(weave!.threads[0].design !== undefined, 'thread must still surface design');
        assert(weave!.threads[0].plans.length === 1, 'thread must still surface plan');
        assert(weave!.threads[0].plans[0].status === 'done', 'plan must have status done');
        console.log('    ✅ data layer: threads, dones, chats all surfaced after full workflow');
    }

    // ── test 6: multi-thread weave — 2 threads + loose fiber surfaced by loadWeave ─
    console.log('  • multi-thread: 2 threads + loose fiber all surfaced by loadWeave...');
    {
        const loomRoot = await setupWorkspace();
        await seedWeaveWithThread(loomRoot, 'ww-weave6', 'thread-alpha');
        await seedThread(loomRoot, 'ww-weave6', 'thread-beta');
        await seedLooseFiber(loomRoot, 'ww-weave6', 'floating-idea');

        const weave = await loadWeave(loomRoot, 'ww-weave6');
        assert(weave !== null, 'weave must load');
        assert(weave!.threads.length === 2, `expected 2 threads, got ${weave!.threads.length}`);
        const threadIds = weave!.threads.map(t => t.id).sort();
        assert(threadIds[0] === 'thread-alpha', `first thread must be thread-alpha, got ${threadIds[0]}`);
        assert(threadIds[1] === 'thread-beta', `second thread must be thread-beta, got ${threadIds[1]}`);
        assert(weave!.looseFibers.length === 1, `expected 1 loose fiber, got ${weave!.looseFibers.length}`);
        assert(weave!.looseFibers[0].id === 'floating-idea', 'loose fiber must have id floating-idea');
        console.log('    ✅ multi-thread: 2 threads + loose fiber surfaced correctly');
    }

    // ── test 7: seedDoneInThread — done doc surfaced in thread.dones[] ───────
    console.log('  • seedDoneInThread: done doc surfaced in thread.dones[]...');
    {
        const loomRoot = await setupWorkspace();
        const { planId } = await seedWeaveWithThread(loomRoot, 'ww-weave7', 'feature-f', { planStatus: 'done', steps: 1 });
        await seedDoneInThread(loomRoot, 'ww-weave7', 'feature-f', planId);

        const weave = await loadWeave(loomRoot, 'ww-weave7');
        assert(weave !== null, 'weave must load');
        assert(weave!.threads.length === 1, 'must have 1 thread');
        assert(weave!.threads[0].dones.length === 1, `expected 1 done doc, got ${weave!.threads[0].dones.length}`);
        assert(weave!.threads[0].dones[0].id === `${planId}-done`, 'done doc must have correct id');
        console.log('    ✅ seedDoneInThread: done doc surfaced in thread.dones[]');
    }

    console.log('\n✨ All workspace-workflow tests passed!\n');
}

testWorkspaceWorkflow().catch(err => {
    console.error('❌ workspace-workflow.test.ts failed:', err.message);
    process.exit(1);
});
