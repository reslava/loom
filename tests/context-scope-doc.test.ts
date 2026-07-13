import { assert } from './test-utils.ts';
import { assembleContext } from '../packages/app/dist/context/assembleContext.js';
import { createEmptyIndex } from '../packages/core/dist/linkIndex.js';

// ---------------------------------------------------------------------------
// scope: 'doc' — the `read`/`reply` slang path. The full bundle is exercised by
// context-assembler.test.ts; this file asserts the doc-only short-circuit:
// only the target is emitted, no ctx / parent chain / requires_load, while the
// weaveSlug/threadUlid header and the alreadyLoaded ledger still work.
// ---------------------------------------------------------------------------

function doc(over: any): any {
    return {
        id: over.id,
        type: over.type,
        title: over.title ?? over.id,
        status: over.status ?? 'active',
        created: '2026-07-13',
        version: over.version ?? 1,
        tags: [],
        parent_id: null,
        requires_load: over.requires_load ?? [],
        content: over.content ?? `BODY:${over.id}`,
        ...over,
    };
}

function buildFixture() {
    const gctx = doc({ id: 'g-ctx', type: 'ctx', content: 'GLOBAL CTX' });
    const wctx = doc({ id: 'w-ctx', type: 'ctx', content: 'WEAVE CTX' });
    const refA = doc({ id: 'rf-A', type: 'reference', content: 'A' });
    const idea = doc({ id: 'i1', type: 'idea', content: 'IDEA' });
    const design = doc({ id: 'd1', type: 'design', content: 'DESIGN' });
    const plan = doc({ id: 'p1', type: 'plan', status: 'implementing', steps: [], content: 'PLAN' });
    // Target chat pulls a requires_load ref — doc scope must NOT follow it.
    const chat = doc({ id: 'c1', type: 'chat', content: 'CHAT', requires_load: ['rf-A'] });

    const thread = {
        id: 't1', weaveSlug: 'w1', idea, design, plans: [plan], dones: [], chats: [chat], refDocs: [],
        allDocs: [idea, design, plan, chat],
        // The authored thread manifest carries the th_ ULID the header exposes.
        manifest: { id: 'th_TESTSLANG000000000000000' },
    };
    const weave = {
        id: 'w1', threads: [thread], looseFibers: [wctx], chats: [], refDocs: [refA],
        allDocs: [idea, design, plan, chat, wctx, refA],
    };

    const index = createEmptyIndex();
    for (const d of [gctx, wctx, refA, idea, design, plan, chat]) {
        index.byId.set(d.id, `/fake/${d.id}.md`);
    }

    const state: any = {
        loomRoot: '/fake', mode: 'mono', loomName: '(local)',
        globalDocs: [gctx], globalChats: [], weaves: [weave],
        archivedWeaves: [], archivedLooseDocs: [], index,
        generatedAt: '2026-07-13T00:00:00.000Z', summary: {},
    };
    return state;
}

async function run() {
    console.log('🔁 Running assembleContext scope:doc tests...\n');

    const state = buildFixture();

    // ── Baseline: full scope bundles ctx + parent chain + requires_load ───────
    console.log('  • full scope still bundles the surrounding context...');
    const full = assembleContext('c1', 'chat', { include: [], exclude: [] }, state, [], 'full');
    const fullIds = full.docs.map((d: any) => d.id);
    assert(fullIds.includes('g-ctx') && fullIds.includes('w-ctx'), 'full scope should include ctx');
    assert(fullIds.includes('i1') && fullIds.includes('d1') && fullIds.includes('p1'), 'full scope should include the parent chain');
    assert(fullIds.includes('rf-A'), 'full scope should follow requires_load');
    assert(fullIds.includes('c1'), 'full scope should include the target');
    console.log('    ✅ full scope unchanged (default behaviour preserved)');

    // ── Doc scope: ONLY the target ────────────────────────────────────────────
    console.log('  • doc scope emits exactly the target, nothing else...');
    const only = assembleContext('c1', 'chat', { include: [], exclude: [] }, state, [], 'doc');
    assert(only.docs.length === 1, `doc scope must emit exactly one doc, got ${only.docs.length}: ${JSON.stringify(only.docs.map((d: any) => d.id))}`);
    assert(only.docs[0].id === 'c1', 'the single doc must be the target');
    assert(only.docs[0].scope === 'target', 'the target scope should be "target"');
    assert(only.docs[0].content === 'CHAT', 'target content should be present');
    // Explicitly: none of the surrounding docs leaked in.
    for (const leaked of ['g-ctx', 'w-ctx', 'i1', 'd1', 'p1', 'rf-A']) {
        assert(!only.docs.some((d: any) => d.id === leaked), `doc scope must not include ${leaked}`);
    }
    console.log('    ✅ doc scope returns only the target (no ctx / parent chain / requires_load)');

    // ── Header still carries the active-thread address ────────────────────────
    console.log('  • doc scope still populates the weaveSlug/threadUlid header...');
    assert(only.weaveSlug === 'w1', `header weaveSlug should be w1, got ${only.weaveSlug}`);
    assert(only.threadUlid === 'th_TESTSLANG000000000000000', `header threadUlid should be present, got ${only.threadUlid}`);
    assert(only.targetId === 'c1', 'targetId should be the resolved target');
    console.log('    ✅ header carries weaveSlug + threadUlid (caller keeps the active-thread address)');

    // ── Composes with a non-chat target too (read design) ─────────────────────
    console.log('  • doc scope on a non-chat target (read design)...');
    const designOnly = assembleContext('d1', 'design', { include: [], exclude: [] }, state, [], 'doc');
    assert(designOnly.docs.length === 1 && designOnly.docs[0].id === 'd1', 'doc scope on a design must emit only the design');
    console.log('    ✅ read design → only the design doc');

    // ── Ledger: a read of an already-held doc yields an empty delta ────────────
    console.log('  • doc scope + ?loaded= of the target → empty delta ...');
    const held = assembleContext('c1', 'chat', { include: [], exclude: [] }, state, [{ id: 'c1', version: 1 }], 'doc');
    assert(held.docs.length === 0, `a held target must not be re-emitted, got ${held.docs.length}`);
    assert(held.manifest.some((m: any) => m.id === 'c1' && m.version === 1), 'the held target should be recorded in the manifest');
    assert(held.threadUlid === 'th_TESTSLANG000000000000000', 'header threadUlid still present on an empty delta');
    console.log('    ✅ already-held target dedupes to an empty delta (no double-read)');

    console.log('\n✅ assembleContext scope:doc tests passed\n');
}

run().catch(e => { console.error('❌', e); process.exit(1); });
