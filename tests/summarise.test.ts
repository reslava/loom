import * as path from 'path';
import { remove, ensureDir, outputFile, pathExists } from 'fs-extra';
import { readFile, writeFile } from 'fs/promises';
import * as fsNative from 'fs';
import * as os from 'os';
import { assert, mockAIClient, createDesignDoc, createPlanDoc } from './test-utils.ts';
import { loadWeave } from '../packages/fs/dist/index.js';
import { summarise } from '../packages/app/dist/summarise.js';
import { serializeFrontmatter } from '../packages/core/dist/index.js';

const TMP = path.join(os.tmpdir(), 'loom-summarise-tests');

// Adapter matching what summarise.ts expects from deps.fs
const fsDeps = {
    existsSync: fsNative.existsSync,
    readFile: (p: string, enc: string) => readFile(p, enc as any),
    writeFile: (p: string, content: string) => writeFile(p, content),
    ensureDir,
    pathExists,
    remove,
} as any;

async function makeLoomRoot(): Promise<string> {
    await remove(TMP);
    await ensureDir(path.join(TMP, '.loom'));
    await outputFile(path.join(TMP, '.loom', 'workflow.yml'), 'version: 1\n');
    return TMP;
}

async function writeDoneDoc(weavePath: string, planId: string, decisions: string[], openItems: string[]): Promise<void> {
    const doneId = `${planId}-done`;
    const body = [
        '## What was built',
        'Test implementation.',
        '',
        '## Decisions made',
        ...decisions.map(d => `- ${d}`),
        '',
        '## Open items',
        ...openItems.map(o => `- ${o}`),
    ].join('\n');

    const frontmatter = serializeFrontmatter({
        type: 'done',
        id: doneId,
        title: `Done — ${planId}`,
        status: 'final',
        created: '2026-04-23',
        version: 1,
        tags: [],
        parent_id: planId,
        child_ids: [],
        requires_load: [],
    });

    // Thread layout: done doc inside {threadId}/done/ (threadId = weaveId prefix from planId)
    const threadId = planId.split('-plan-')[0];
    const doneDir = path.join(weavePath, threadId, 'done');
    await ensureDir(doneDir);
    await outputFile(path.join(doneDir, `${doneId}.md`), `${frontmatter}\n${body}\n`);
}

async function testSummarise() {
    console.log('📝 Running summarise use-case tests...\n');

    // ── test 1: done doc content appears in AI message ───────────────────────
    console.log('  • summarise: done doc decisions + open items sent to AI...');
    {
        const loomRoot = await makeLoomRoot();
        const weaveId = 'sum-weave';
        const weavePath = path.join(loomRoot, 'loom', weaveId);
        await createDesignDoc(weavePath, weaveId, { threadId: weaveId });

        const planId = `${weaveId}-plan-001`;
        await createPlanDoc(weavePath, planId, { status: 'done', steps: [{ order: 1, description: 'Done', done: true, files_touched: [], blocked_by: [] }] } as any);
        await writeDoneDoc(weavePath, planId, ['Used approach A', 'Chose library X'], ['Review performance', 'Add tests']);

        let capturedMessages: any[] = [];
        const capturingClient = {
            complete: async (msgs: any[]) => {
                capturedMessages = msgs;
                return '## Problem Statement\nTest.';
            },
        };

        const loadWeaveOrThrow = async (root: string, id: string) => {
            const w = await loadWeave(root, id);
            if (!w) throw new Error('empty');
            return w;
        };

        await summarise(
            { weaveId },
            {
                loadWeave: loadWeaveOrThrow,
                getActiveLoomRoot: () => loomRoot,
                fs: fsDeps,
                loomRoot,
                aiClient: capturingClient,
            }
        );

        const userMsg = capturedMessages.find((m: any) => m.role === 'user')?.content ?? '';
        assert(userMsg.includes('Done docs (implementation records)') || userMsg.includes('Done docs'), 'done docs section must appear in AI message');
        assert(userMsg.includes('Used approach A'), '"Decisions made" bullet must appear in AI message');
        assert(userMsg.includes('Review performance'), '"Open items" bullet must appear in AI message');
        console.log('    ✅ done doc Decisions made + Open items forwarded to AI');
    }

    // ── test 2: ctx file written with correct frontmatter ────────────────────
    console.log('  • summarise: ctx file created with correct frontmatter...');
    {
        const loomRoot = await makeLoomRoot();
        const weaveId = 'sum-weave2';
        const weavePath = path.join(loomRoot, 'loom', weaveId);
        await createDesignDoc(weavePath, weaveId, { threadId: weaveId });

        const loadWeaveOrThrow = async (root: string, id: string) => {
            const w = await loadWeave(root, id);
            if (!w) throw new Error('empty');
            return w;
        };

        const result = await summarise(
            { weaveId },
            {
                loadWeave: loadWeaveOrThrow,
                getActiveLoomRoot: () => loomRoot,
                fs: fsDeps,
                loomRoot,
                aiClient: mockAIClient('## Problem Statement\nSummary body.') as any,
            }
        );

        assert(result.generated === true, 'ctx must be generated');
        assert(fsNative.existsSync(result.ctxPath), 'ctx file must exist');
        const content = fsNative.readFileSync(result.ctxPath, 'utf8');
        assert(content.includes('type: ctx'), 'ctx must have type: ctx');
        assert(content.includes('tags: [ctx, summary]'), 'ctx must have inline tags');
        assert(content.includes('Summary body.'), 'AI body must appear in ctx file');
        console.log('    ✅ ctx file written with correct frontmatter and body');
    }

    // ── test 3: force=false skips regeneration when version matches ──────────
    console.log('  • summarise: skips regeneration when ctx version matches design...');
    {
        const loomRoot = await makeLoomRoot();
        const weaveId = 'sum-weave3';
        const weavePath = path.join(loomRoot, 'loom', weaveId);
        await createDesignDoc(weavePath, weaveId, { threadId: weaveId });

        const loadWeaveOrThrow = async (root: string, id: string) => {
            const w = await loadWeave(root, id);
            if (!w) throw new Error('empty');
            return w;
        };
        const deps = {
            loadWeave: loadWeaveOrThrow,
            getActiveLoomRoot: () => loomRoot,
            fs: fsDeps,
            loomRoot,
            aiClient: mockAIClient('First gen.') as any,
        };

        // Generate once
        await summarise({ weaveId }, deps);
        // Try again without force — should skip
        const result2 = await summarise({ weaveId }, { ...deps, aiClient: mockAIClient('Second gen.') as any });
        assert(result2.generated === false, 'second call without force must skip generation');

        const content = fsNative.readFileSync(result2.ctxPath, 'utf8');
        assert(!content.includes('Second gen.'), 'second AI call body must not overwrite ctx');
        console.log('    ✅ skips regeneration when source_version matches');
    }

    // ── test 4: force=true overwrites existing ctx ───────────────────────────
    console.log('  • summarise: force=true overwrites existing ctx...');
    {
        const loomRoot = await makeLoomRoot();
        const weaveId = 'sum-weave4';
        const weavePath = path.join(loomRoot, 'loom', weaveId);
        await createDesignDoc(weavePath, weaveId, { threadId: weaveId });

        const loadWeaveOrThrow = async (root: string, id: string) => {
            const w = await loadWeave(root, id);
            if (!w) throw new Error('empty');
            return w;
        };
        const deps = {
            loadWeave: loadWeaveOrThrow,
            getActiveLoomRoot: () => loomRoot,
            fs: fsDeps,
            loomRoot,
            aiClient: mockAIClient('First gen.') as any,
        };

        await summarise({ weaveId }, deps);
        const result2 = await summarise({ weaveId, force: true }, { ...deps, aiClient: mockAIClient('Forced regen.') as any });
        assert(result2.generated === true, 'force=true must regenerate');
        const content = fsNative.readFileSync(result2.ctxPath, 'utf8');
        assert(content.includes('Forced regen.'), 'forced regen must overwrite ctx');
        console.log('    ✅ force=true overwrites existing ctx');
    }

    await remove(TMP);
    console.log('\n✨ All summarise use-case tests passed!\n');
}

testSummarise().catch(err => {
    console.error('❌ summarise.test.ts failed:', err.message);
    process.exit(1);
});
