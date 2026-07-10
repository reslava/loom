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
    weaveSlug: string,
    threadSlug: string,
    planStatus = 'implementing',
): Promise<void> {
    const threadPath = path.join(loomRoot, 'loom', weaveSlug, threadSlug);
    const planId = `${threadSlug}-plan-001`;

    const designFm = makeFrontmatter({
        type: 'design',
        id: `${threadSlug}-design`,
        title: `${threadSlug} Design`,
        status: 'active',
        created: '2026-04-23',
        version: 1,
        child_ids: [planId],
    });
    await fs.outputFile(path.join(threadPath, `${threadSlug}-design.md`), `${designFm}\n## Overview\nTest.\n`);

    const planFm = makeFrontmatter({
        type: 'plan',
        id: planId,
        title: `Plan ${planId}`,
        status: planStatus,
        created: '2026-04-23',
        version: 1,
        parent_id: `${threadSlug}-design`,
    });
    await fs.outputFile(
        path.join(threadPath, 'plans', `${planId}.md`),
        `${planFm}\n## Steps\n| Done | # | Step | Files | Blocked by |\n|------|---|------|-------|------------|\n| 🔳 | 1 | Do it | src/ | — |\n`,
    );
}

async function seedDoneInThread(
    loomRoot: string,
    weaveSlug: string,
    threadSlug: string,
    planId: string,
): Promise<void> {
    const donePath = path.join(loomRoot, 'loom', weaveSlug, threadSlug, 'done');
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
    weaveSlug: string,
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
        path.join(loomRoot, 'loom', weaveSlug, `${docId}.md`),
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
        const weaveSlug = 'core-engine';
        await seedThread(loomRoot, weaveSlug, 'state-management', 'implementing');
        await seedThread(loomRoot, weaveSlug, 'event-bus', 'draft');

        const weave = await loadWeave(loomRoot, weaveSlug);

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
        const weaveSlug = 'ai-integration';
        await seedLooseFiber(loomRoot, weaveSlug, 'ai-integration-idea');

        const weave = await loadWeave(loomRoot, weaveSlug);

        assert(weave !== null, 'loadWeave must return a weave');
        assert(weave!.threads.length === 0, `expected 0 threads, got ${weave!.threads.length}`);
        assert(weave!.looseFibers.length === 1, `expected 1 loose fiber, got ${weave!.looseFibers.length}`);
        assert(weave!.looseFibers[0].id === 'ai-integration-idea', 'loose fiber id wrong');
        console.log('    ✅ loose fiber loaded correctly');
    }

    // ── test 3: done doc inside thread ──────────────────────────────────────
    console.log('  • loadWeave: done doc inside thread...');
    {
        const weaveSlug = 'vscode-extension';
        const threadSlug = 'tree-view';
        await seedThread(loomRoot, weaveSlug, threadSlug, 'implementing');
        await seedDoneInThread(loomRoot, weaveSlug, threadSlug, `${threadSlug}-plan-001`);

        const weave = await loadWeave(loomRoot, weaveSlug);

        assert(weave !== null, 'loadWeave must return a weave');
        const thread = weave!.threads.find(t => t.id === threadSlug);
        assert(thread !== undefined, 'tree-view thread must exist');
        assert(thread!.dones.length === 1, `expected 1 done, got ${thread!.dones.length}`);
        assert(thread!.dones[0].parent_id === `${threadSlug}-plan-001`, 'done parent_id must link to plan');
        console.log('    ✅ done doc inside thread correct');
    }

    // ── test 4: reserved subdirs not treated as threads ──────────────────────
    console.log('  • loadWeave: reserved subdirs (plans/, done/, ai-chats/) not treated as threads...');
    {
        const weaveSlug = 'docs-infra';
        // Write a loose fiber so weave is non-empty
        await seedLooseFiber(loomRoot, weaveSlug, 'docs-infra-idea');
        // Create reserved subdirs with .md files
        const weavePath = path.join(loomRoot, 'loom', weaveSlug);
        const legacyPlanFm = makeFrontmatter({ type: 'plan', id: 'docs-infra-plan-001', title: 'Plan', status: 'draft', created: '2026-04-23', version: 1 });
        await fs.outputFile(path.join(weavePath, 'plans', 'docs-infra-plan-001.md'), `${legacyPlanFm}\n## Steps\n| Done | # | Step | Files | Blocked by |\n|------|---|------|-------|------------|\n| 🔳 | 1 | Step | src/ | — |\n`);

        const weave = await loadWeave(loomRoot, weaveSlug);
        assert(weave !== null, 'loadWeave must return a weave');
        assert(weave!.threads.length === 0, `reserved subdirs must not become threads, got ${weave!.threads.length}`);
        console.log('    ✅ reserved subdirs ignored as threads');
    }

    await fs.remove(TMP);
    console.log('\n✨ All loadWeave tests passed!\n');
}

async function testBuildLinkIndexThreadId() {
    console.log('🔗 Running buildLinkIndex threadSlug tests...\n');

    await fs.remove(TMP);
    const loomRoot = TMP;
    await setupLoomRoot(loomRoot);

    console.log('  • buildLinkIndex: thread docs have threadSlug, weave-root docs do not...');
    {
        const weaveSlug = 'core-engine';
        await seedThread(loomRoot, weaveSlug, 'state-management', 'implementing');
        await seedLooseFiber(loomRoot, weaveSlug, 'core-engine-idea');

        const index = await buildLinkIndex(loomRoot);

        const designEntry = index.documents.get('state-management-design');
        assert(designEntry !== undefined, 'state-management-design must be in index');
        assert(designEntry!.threadSlug === 'state-management', `expected threadSlug "state-management", got "${designEntry!.threadSlug}"`);

        const planEntry = index.documents.get('state-management-plan-001');
        assert(planEntry !== undefined, 'state-management-plan-001 must be in index');
        assert(planEntry!.threadSlug === 'state-management', `plan must have threadSlug "state-management"`);

        const looseEntry = index.documents.get('core-engine-idea');
        assert(looseEntry !== undefined, 'core-engine-idea must be in index');
        assert(looseEntry!.threadSlug === undefined, `loose fiber must have no threadSlug, got "${looseEntry!.threadSlug}"`);

        console.log('    ✅ threadSlug set correctly on thread docs, absent on loose fibers');
    }

    await fs.remove(TMP);
    console.log('\n✨ All buildLinkIndex threadSlug tests passed!\n');
}

testLoadWeaveWithThreads()
    .then(() => testBuildLinkIndexThreadId())
    .catch(err => {
        console.error('❌ weave-repository.test.ts failed:', err.message);
        process.exit(1);
    });
