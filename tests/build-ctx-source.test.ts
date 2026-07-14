import { assert } from './test-utils.ts';
import {
    buildCtxSource, ctxTarget, computeSourceHash, buildCtxShell,
} from '../packages/app/dist/index.js';

function doc(over: any) {
    return {
        type: 'idea', id: 'x', title: 'X', status: 'active', created: '2026-05-31',
        version: 1, tags: [], parent_id: null, requires_load: [], content: '', ...over,
    };
}

function makeState() {
    const idea = doc({ type: 'idea', id: 't1-idea', title: 'T1 Idea', status: 'active' });
    const design = doc({ type: 'design', id: 't1-design', title: 'T1 Design', status: 'active', version: 2, content: 'DESIGN BODY HERE' });
    const plan = { ...doc({ type: 'plan', id: 't1-plan-001', title: 'P1', status: 'implementing' }), steps: [{ order: 1, status: 'done' }, { order: 2, status: 'pending' }] };
    const done = doc({ type: 'done', id: 't1-plan-001-done', title: 'P1 Done', status: 'done', parent_id: 't1-plan-001', content: '## What\n- decided A\n- decided B\n## Open items\n- open X' });
    const thread = { id: 't1', weaveSlug: 'demo', idea, design, plans: [plan], dones: [done], chats: [], refDocs: [], allDocs: [idea, design, plan, done] };
    const weave = { id: 'demo', threads: [thread], looseFibers: [], chats: [], refDocs: [], allDocs: [idea, design, plan, done] };
    return {
        loomRoot: '/fake', mode: 'mono', loomName: '(local)', globalDocs: [], globalChats: [],
        weaves: [weave], archivedWeaves: [], archivedLooseDocs: [],
        index: { byId: new Map(), bySlug: new Map() }, generatedAt: 'x', summary: {},
    } as any;
}

async function run() {
    console.log('🧩 Running buildCtxSource tests...\n');
    const state = makeState();

    // ── ctx is global-only: source lists active/implementing weaves + threads ──
    console.log('  • global source...');
    const gsrc = buildCtxSource(state);
    assert(gsrc.includes('## demo'), 'global lists the active weave');
    assert(gsrc.includes('- t1'), 'global lists the thread');
    console.log('    ✅ active weaves + threads');

    // ── canonical target (global-only) ────────────────────────────────────────
    console.log('  • canonical target...');
    const gt = ctxTarget();
    assert(gt.ctxId === 'loom-ctx' && gt.relPath === 'loom/ctx.md', 'global target');
    console.log('    ✅ loom-ctx flat path');

    // ── hash idempotency + shell frontmatter ──────────────────────────────────
    console.log('  • source_hash + shell...');
    const h1 = computeSourceHash(gsrc);
    const h2 = computeSourceHash(gsrc);
    assert(h1 === h2 && h1.length === 40, 'sha1 is stable, 40 hex chars');
    const shell = buildCtxShell(gt, 1, h1);
    assert(shell.includes('type: ctx') && shell.includes('id: loom-ctx'), 'shell frontmatter id/type');
    assert(shell.includes('parent_id: null'), 'parent_id null');
    assert(shell.includes(`source_hash: ${h1}`), 'source_hash present');
    assert(shell.includes('last_refreshed:'), 'last_refreshed recency stamp present');
    console.log('    ✅ stable hash + canonical shell');

    console.log('\n✨ All buildCtxSource tests passed!\n');
}

run().catch(err => { console.error('❌ build-ctx-source.test.ts failed:', err.message); process.exit(1); });
