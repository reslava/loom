import * as path from 'path';
import { remove, ensureDir, outputFile, pathExists } from 'fs-extra';
import { readdir } from 'fs/promises';
import * as fsNative from 'fs';
import * as os from 'os';
import { assert, mockAIClient, createPlanDoc } from './test-utils.ts';
import { loadWeave, saveDoc } from '../packages/fs/dist/index.js';
import { doStep } from '../packages/app/dist/doStep.js';

const TMP = path.join(os.tmpdir(), 'loom-do-step-tests');

async function makeLoomRoot(): Promise<string> {
    await remove(TMP);
    await ensureDir(path.join(TMP, '.loom'));
    await outputFile(path.join(TMP, '.loom', 'workflow.yml'), 'version: 1\n');
    return TMP;
}

const fsDeps = {
    ensureDir,
    readdir,
    pathExists,
    remove,
};

function makeDeps(loomRoot: string, aiResponse = '## AI response\nDo this and that.') {
    const loadWeaveOrThrow = async (root: string, id: string) => {
        const w = await loadWeave(root, id);
        if (!w) throw new Error(`Weave '${id}' is empty`);
        return w;
    };
    return {
        loadWeave: loadWeaveOrThrow,
        saveDoc,
        fs: fsDeps as any,
        aiClient: mockAIClient(aiResponse),
        loomRoot,
    };
}

async function testDoStep() {
    console.log('🤖 Running doStep use-case tests...\n');

    // ── test 1: chat doc created with correct structure ──────────────────────
    console.log('  • doStep: chat doc created with ## Rafa: + ## AI: structure...');
    {
        const loomRoot = await makeLoomRoot();
        const weaveId = 'ds-weave';
        const weavePath = path.join(loomRoot, 'loom', weaveId);
        const planId = `${weaveId}-plan-001`;

        await createPlanDoc(weavePath, planId, { status: 'implementing' } as any);

        const AI_BODY = 'Step 1 implementation details go here.';
        const result = await doStep({ planId, steps: [1] }, makeDeps(loomRoot, AI_BODY));

        assert(result.chatPath !== undefined, 'chatPath must be returned');
        assert(result.chatId !== undefined, 'chatId must be returned');
        assert(fsNative.existsSync(result.chatPath), 'chat file must exist');

        const content = fsNative.readFileSync(result.chatPath, 'utf8');
        assert(content.includes('# CHAT'), 'chat doc must have # CHAT header');
        assert(content.includes('## Rafa:'), 'chat doc must have ## Rafa: section');
        assert(content.includes('## AI:'), 'chat doc must have ## AI: section');
        assert(content.includes(AI_BODY), 'AI response must appear in chat doc');
        assert(content.includes('Step 1'), 'step reference must appear in user section');
        console.log('    ✅ chat doc structure correct');
    }

    // ── test 2: parent_id set to planId ─────────────────────────────────────
    console.log('  • doStep: chat doc parent_id links to plan...');
    {
        const loomRoot = await makeLoomRoot();
        const weaveId = 'ds-weave2';
        const weavePath = path.join(loomRoot, 'loom', weaveId);
        const planId = `${weaveId}-plan-001`;

        await createPlanDoc(weavePath, planId, { status: 'implementing' } as any);

        const result = await doStep({ planId, steps: [1] }, makeDeps(loomRoot));

        const content = fsNative.readFileSync(result.chatPath, 'utf8');
        assert(content.includes(`parent_id: ${planId}`), `parent_id must be ${planId}`);
        console.log('    ✅ parent_id links to plan');
    }

    // ── test 3: multiple steps in one call ───────────────────────────────────
    console.log('  • doStep: multiple steps included in user message...');
    {
        const loomRoot = await makeLoomRoot();
        const weaveId = 'ds-weave3';
        const weavePath = path.join(loomRoot, 'loom', weaveId);
        const planId = `${weaveId}-plan-001`;

        await createPlanDoc(weavePath, planId, { status: 'implementing' } as any);

        let capturedMessages: any[] = [];
        const capturingDeps = {
            ...makeDeps(loomRoot),
            aiClient: {
                complete: async (msgs: any[]) => {
                    capturedMessages = msgs;
                    return 'Multi-step response.';
                },
            },
        };

        const result = await doStep({ planId, steps: [1, 2] }, capturingDeps);

        const userMsg = capturedMessages.find((m: any) => m.role === 'user')?.content ?? '';
        assert(userMsg.includes('Step 1'), 'Step 1 must be in AI message');
        assert(userMsg.includes('Step 2'), 'Step 2 must be in AI message');

        const content = fsNative.readFileSync(result.chatPath, 'utf8');
        assert(content.includes('Steps 1, 2'), 'chat title must reference both steps');
        console.log('    ✅ multiple steps handled correctly');
    }

    // ── test 4: invalid planId throws ────────────────────────────────────────
    console.log('  • doStep: invalid planId throws...');
    {
        const loomRoot = await makeLoomRoot();
        const weaveId = 'ds-weave4';
        const weavePath = path.join(loomRoot, 'loom', weaveId);
        const planId = `${weaveId}-plan-001`;
        await createPlanDoc(weavePath, planId, { status: 'implementing' } as any);

        let threw = false;
        try {
            await doStep({ planId: `${weaveId}-plan-999`, steps: [1] }, makeDeps(loomRoot));
        } catch {
            threw = true;
        }
        assert(threw, 'unknown plan must throw');
        console.log('    ✅ unknown planId throws correctly');
    }

    await remove(TMP);
    console.log('\n✨ All doStep use-case tests passed!\n');
}

testDoStep().catch(err => {
    console.error('❌ do-step.test.ts failed:', err.message);
    process.exit(1);
});
