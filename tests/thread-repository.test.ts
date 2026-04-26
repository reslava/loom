import * as path from 'path';
import * as fs from 'fs-extra';
import * as os from 'os';
import { assert } from './test-utils.ts';
import { loadThread, saveThread } from '../packages/fs/dist/index.js';
import { serializeFrontmatter } from '../packages/core/dist/index.js';

const TMP = path.join(os.tmpdir(), 'loom-thread-tests');

async function setupLoomRoot(loomRoot: string): Promise<void> {
    await fs.ensureDir(path.join(loomRoot, '.loom'));
    await fs.outputFile(path.join(loomRoot, '.loom', 'workflow.yml'), 'version: 1\n');
}

function makeFrontmatter(fields: Record<string, unknown>): string {
    return serializeFrontmatter({
        tags: [],
        parent_id: null,
        child_ids: [],
        requires_load: [],
        ...fields,
    });
}

async function writeThreadIdea(threadPath: string, threadId: string): Promise<void> {
    const fm = makeFrontmatter({
        type: 'idea',
        id: `${threadId}-idea`,
        title: `${threadId} Idea`,
        status: 'draft',
        created: '2026-04-23',
        version: 1,
    });
    await fs.outputFile(path.join(threadPath, `${threadId}-idea.md`), `${fm}\n## Summary\nTest idea.\n`);
}

async function writeThreadDesign(threadPath: string, threadId: string): Promise<void> {
    const planId = `${threadId}-plan-001`;
    const fm = makeFrontmatter({
        type: 'design',
        id: `${threadId}-design`,
        title: `${threadId} Design`,
        status: 'active',
        created: '2026-04-23',
        version: 1,
        child_ids: [planId],
    });
    await fs.outputFile(path.join(threadPath, `${threadId}-design.md`), `${fm}\n## Overview\nTest design.\n`);
}

async function writeThreadPlan(threadPath: string, planId: string, status = 'implementing'): Promise<void> {
    const fm = makeFrontmatter({
        type: 'plan',
        id: planId,
        title: `Plan ${planId}`,
        status,
        created: '2026-04-23',
        version: 1,
    });
    await fs.outputFile(
        path.join(threadPath, 'plans', `${planId}.md`),
        `${fm}\n## Steps\n| Done | # | Step | Files touched | Blocked by |\n|------|---|------|---------------|------------|\n| 🔳 | 1 | First step | src/ | — |\n`,
    );
}

async function writeThreadDone(threadPath: string, doneId: string, parentId: string): Promise<void> {
    const fm = makeFrontmatter({
        type: 'done',
        id: doneId,
        title: `Done — ${parentId}`,
        status: 'final',
        created: '2026-04-23',
        version: 1,
        parent_id: parentId,
    });
    await fs.outputFile(path.join(threadPath, 'done', `${doneId}.md`), `${fm}\n## What was built\nTest done.\n`);
}

async function testLoadThread() {
    console.log('🧵 Running loadThread tests...\n');

    await fs.remove(TMP);
    const loomRoot = TMP;
    await setupLoomRoot(loomRoot);

    // ── test 1: load thread with idea, design, plan, done ──────────────────
    console.log('  • loadThread: idea + design + plan + done all loaded...');
    {
        const weaveId = 'core-engine';
        const threadId = 'state-management';
        const threadPath = path.join(loomRoot, 'loom', weaveId, threadId);

        await writeThreadIdea(threadPath, threadId);
        await writeThreadDesign(threadPath, threadId);
        await writeThreadPlan(threadPath, `${threadId}-plan-001`);
        await writeThreadDone(threadPath, `${threadId}-plan-001-done`, `${threadId}-plan-001`);

        const thread = await loadThread(loomRoot, weaveId, threadId);

        assert(thread.id === threadId, `thread.id must be "${threadId}"`);
        assert(thread.weaveId === weaveId, `thread.weaveId must be "${weaveId}"`);
        assert(thread.idea !== undefined, 'thread.idea must be loaded');
        assert(thread.idea!.type === 'idea', 'idea type must be "idea"');
        assert(thread.design !== undefined, 'thread.design must be loaded');
        assert(thread.design!.type === 'design', 'design type must be "design"');
        assert(thread.plans.length === 1, `expected 1 plan, got ${thread.plans.length}`);
        assert(thread.dones.length === 1, `expected 1 done, got ${thread.dones.length}`);
        assert(thread.dones[0].parent_id === `${threadId}-plan-001`, 'done parent_id must link to plan');
        assert(thread.allDocs.length === 4, `expected 4 allDocs, got ${thread.allDocs.length}`);
        console.log('    ✅ all docs loaded correctly');
    }

    // ── test 2: load thread with no idea or design ─────────────────────────
    console.log('  • loadThread: plan-only thread (no idea/design)...');
    {
        const weaveId = 'core-engine';
        const threadId = 'event-bus';
        const threadPath = path.join(loomRoot, 'loom', weaveId, threadId);

        await writeThreadPlan(threadPath, `${threadId}-plan-001`, 'draft');

        const thread = await loadThread(loomRoot, weaveId, threadId);

        assert(thread.idea === undefined, 'thread.idea must be undefined');
        assert(thread.design === undefined, 'thread.design must be undefined');
        assert(thread.plans.length === 1, 'must have 1 plan');
        assert(thread.allDocs.length === 1, 'allDocs must have 1 entry');
        console.log('    ✅ plan-only thread loaded');
    }

    console.log('\n✨ All loadThread tests passed!\n');
}

async function testSaveThread() {
    console.log('💾 Running saveThread round-trip tests...\n');

    await fs.remove(TMP);
    const loomRoot = TMP;
    await setupLoomRoot(loomRoot);

    // ── test: save then reload ──────────────────────────────────────────────
    console.log('  • saveThread + loadThread round-trip...');
    {
        const weaveId = 'vscode-extension';
        const threadId = 'tree-view';
        const threadPath = path.join(loomRoot, 'loom', weaveId, threadId);

        await writeThreadDesign(threadPath, threadId);
        await writeThreadPlan(threadPath, `${threadId}-plan-001`);

        const thread1 = await loadThread(loomRoot, weaveId, threadId);
        assert(thread1.plans.length === 1, 'must load 1 plan before save');

        // Mutate plan status and save
        const mutated = {
            ...thread1,
            plans: [{ ...thread1.plans[0], status: 'done' as const }],
            allDocs: [
                ...(thread1.idea ? [thread1.idea] : []),
                ...(thread1.design ? [thread1.design] : []),
                { ...thread1.plans[0], status: 'done' as const },
                ...thread1.dones,
                ...thread1.chats,
            ],
        };
        await saveThread(loomRoot, weaveId, mutated);

        const thread2 = await loadThread(loomRoot, weaveId, threadId);
        assert(thread2.plans[0].status === 'done', `expected status "done", got "${thread2.plans[0].status}"`);
        console.log('    ✅ round-trip save/load correct');
    }

    await fs.remove(TMP);
    console.log('\n✨ All saveThread tests passed!\n');
}

Promise.all([
    testLoadThread().then(() => testSaveThread()),
]).catch(err => {
    console.error('❌ thread-repository.test.ts failed:', err.message);
    process.exit(1);
});
