import * as path from 'path';
import * as fs from 'fs-extra';
import * as os from 'os';
import { assert } from './test-utils.ts';
import { loadWeave, buildLinkIndex } from '../packages/fs/dist/index.js';
import { serializeFrontmatter } from '../packages/core/dist/index.js';

const TMP = path.join(os.tmpdir(), 'loom-repo-tests');

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

async function seedThread(
    loomRoot: string,
    weaveId: string,
    threadId: string,
    planStatus = 'implementing',
): Promise<void> {
    const threadPath = path.join(loomRoot, 'loom', weaveId, threadId);
    const planId = `${threadId}-plan-001`;

    const designFm = makeFrontmatter({
        type: 'design',
        id: `${threadId}-design`,
        title: `${threadId} Design`,
        status: 'active',
        created: '2026-04-23',
        version: 1,
        child_ids: [planId],
    });
    await fs.outputFile(path.join(threadPath, `${threadId}-design.md`), `${designFm}\n## Overview\nTest.\n`);

    const planFm = makeFrontmatter({
        type: 'plan',
        id: planId,
        title: `Plan ${planId}`,
        status: planStatus,
        created: '2026-04-23',
        version: 1,
        parent_id: `${threadId}-design`,
    });
    await fs.outputFile(
        path.join(threadPath, 'plans', `${planId}.md`),
        `${planFm}\n## Steps\n| Done | # | Step | Files | Blocked by |\n|------|---|------|-------|------------|\n| 🔳 | 1 | Do it | src/ | — |\n`,
    );
}

async function seedDoneInThread(
    loomRoot: string,
    weaveId: string,
    threadId: string,
    planId: string,
): Promise<void> {
    const donePath = path.join(loomRoot, 'loom', weaveId, threadId, 'done');
    const doneId = `${planId}-done`;
    const fm = makeFrontmatter({
        type: 'done',
        id: doneId,
        title: `Done — ${planId}`,
        status: 'final',
        created: '2026-04-23',
        version: 1,
        parent_id: planId,
    });
    await fs.outputFile(path.join(donePath, `${doneId}.md`), `${fm}\n## What was built\nDone.\n`);
}

async function seedLooseFiber(
    loomRoot: string,
    weaveId: string,
    docId: string,
): Promise<void> {
    const fm = makeFrontmatter({
        type: 'idea',
        id: docId,
        title: `Loose: ${docId}`,
        status: 'draft',
        created: '2026-04-23',
        version: 1,
    });
    await fs.outputFile(
        path.join(loomRoot, 'loom', weaveId, `${docId}.md`),
        `${fm}\n## Summary\nLoose fiber.\n`,
    );
}

async function testLoadWeaveWithThreads() {
    console.log('📦 Running loadWeave (thread-based) tests...\n');

    await fs.remove(TMP);
    const loomRoot = TMP;
    await setupLoomRoot(loomRoot);

    // ── test 1: 2 threads loaded with correct structure ─────────────────────
    console.log('  • loadWeave: 2 threads correctly loaded...');
    {
        const weaveId = 'core-engine';
        await seedThread(loomRoot, weaveId, 'state-management', 'implementing');
        await seedThread(loomRoot, weaveId, 'event-bus', 'draft');

        const weave = await loadWeave(loomRoot, weaveId);

        assert(weave !== null, 'loadWeave must return a weave');
        assert(weave!.threads.length === 2, `expected 2 threads, got ${weave!.threads.length}`);

        const sm = weave!.threads.find(t => t.id === 'state-management');
        assert(sm !== undefined, 'state-management thread must exist');
        assert(sm!.design !== undefined, 'state-management thread must have a design');
        assert(sm!.plans.length === 1, 'state-management thread must have 1 plan');

        const eb = weave!.threads.find(t => t.id === 'event-bus');
        assert(eb !== undefined, 'event-bus thread must exist');
        assert(eb!.plans[0].status === 'draft', 'event-bus plan status must be "draft"');

        assert(weave!.allDocs.length === 4, `expected 4 allDocs (2 designs + 2 plans), got ${weave!.allDocs.length}`);
        console.log('    ✅ 2 threads loaded correctly');
    }

    // ── test 2: loose fiber at weave root ───────────────────────────────────
    console.log('  • loadWeave: loose fiber at weave root...');
    {
        const weaveId = 'ai-integration';
        await seedLooseFiber(loomRoot, weaveId, 'ai-integration-idea');

        const weave = await loadWeave(loomRoot, weaveId);

        assert(weave !== null, 'loadWeave must return a weave');
        assert(weave!.threads.length === 0, `expected 0 threads, got ${weave!.threads.length}`);
        assert(weave!.looseFibers.length === 1, `expected 1 loose fiber, got ${weave!.looseFibers.length}`);
        assert(weave!.looseFibers[0].id === 'ai-integration-idea', 'loose fiber id wrong');
        console.log('    ✅ loose fiber loaded correctly');
    }

    // ── test 3: done doc inside thread ──────────────────────────────────────
    console.log('  • loadWeave: done doc inside thread...');
    {
        const weaveId = 'vscode-extension';
        const threadId = 'tree-view';
        await seedThread(loomRoot, weaveId, threadId, 'implementing');
        await seedDoneInThread(loomRoot, weaveId, threadId, `${threadId}-plan-001`);

        const weave = await loadWeave(loomRoot, weaveId);

        assert(weave !== null, 'loadWeave must return a weave');
        const thread = weave!.threads.find(t => t.id === threadId);
        assert(thread !== undefined, 'tree-view thread must exist');
        assert(thread!.dones.length === 1, `expected 1 done, got ${thread!.dones.length}`);
        assert(thread!.dones[0].parent_id === `${threadId}-plan-001`, 'done parent_id must link to plan');
        console.log('    ✅ done doc inside thread correct');
    }

    // ── test 4: reserved subdirs not treated as threads ──────────────────────
    console.log('  • loadWeave: reserved subdirs (plans/, done/, ai-chats/) not treated as threads...');
    {
        const weaveId = 'docs-infra';
        // Write a loose fiber so weave is non-empty
        await seedLooseFiber(loomRoot, weaveId, 'docs-infra-idea');
        // Create reserved subdirs with .md files
        const weavePath = path.join(loomRoot, 'loom', weaveId);
        const legacyPlanFm = makeFrontmatter({ type: 'plan', id: 'docs-infra-plan-001', title: 'Plan', status: 'draft', created: '2026-04-23', version: 1 });
        await fs.outputFile(path.join(weavePath, 'plans', 'docs-infra-plan-001.md'), `${legacyPlanFm}\n## Steps\n| Done | # | Step | Files | Blocked by |\n|------|---|------|-------|------------|\n| 🔳 | 1 | Step | src/ | — |\n`);

        const weave = await loadWeave(loomRoot, weaveId);
        assert(weave !== null, 'loadWeave must return a weave');
        assert(weave!.threads.length === 0, `reserved subdirs must not become threads, got ${weave!.threads.length}`);
        console.log('    ✅ reserved subdirs ignored as threads');
    }

    await fs.remove(TMP);
    console.log('\n✨ All loadWeave tests passed!\n');
}

async function testBuildLinkIndexThreadId() {
    console.log('🔗 Running buildLinkIndex threadId tests...\n');

    await fs.remove(TMP);
    const loomRoot = TMP;
    await setupLoomRoot(loomRoot);

    console.log('  • buildLinkIndex: thread docs have threadId, weave-root docs do not...');
    {
        const weaveId = 'core-engine';
        await seedThread(loomRoot, weaveId, 'state-management', 'implementing');
        await seedLooseFiber(loomRoot, weaveId, 'core-engine-idea');

        const index = await buildLinkIndex(loomRoot);

        const designEntry = index.documents.get('state-management-design');
        assert(designEntry !== undefined, 'state-management-design must be in index');
        assert(designEntry!.threadId === 'state-management', `expected threadId "state-management", got "${designEntry!.threadId}"`);

        const planEntry = index.documents.get('state-management-plan-001');
        assert(planEntry !== undefined, 'state-management-plan-001 must be in index');
        assert(planEntry!.threadId === 'state-management', `plan must have threadId "state-management"`);

        const looseEntry = index.documents.get('core-engine-idea');
        assert(looseEntry !== undefined, 'core-engine-idea must be in index');
        assert(looseEntry!.threadId === undefined, `loose fiber must have no threadId, got "${looseEntry!.threadId}"`);

        console.log('    ✅ threadId set correctly on thread docs, absent on loose fibers');
    }

    await fs.remove(TMP);
    console.log('\n✨ All buildLinkIndex threadId tests passed!\n');
}

testLoadWeaveWithThreads()
    .then(() => testBuildLinkIndexThreadId())
    .catch(err => {
        console.error('❌ weave-repository.test.ts failed:', err.message);
        process.exit(1);
    });
