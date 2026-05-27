import { assert } from './test-utils.ts';
import { assembleContext, classifyScope } from '../packages/app/dist/context/assembleContext.js';
import { serializeBundle, bundleVisibilityLines } from '../packages/app/dist/context/serializeBundle.js';
import { createEmptyIndex } from '../packages/core/dist/linkIndex.js';

// ---------------------------------------------------------------------------
// Fixture builder — a hand-built LoomState (no IO).
// ---------------------------------------------------------------------------

function doc(over: any): any {
    return {
        id: over.id,
        type: over.type,
        title: over.title ?? over.id,
        status: over.status ?? 'active',
        created: '2026-05-25',
        version: over.version ?? 1,
        tags: [],
        parent_id: null,
        requires_load: over.requires_load ?? [],
        content: over.content ?? `BODY:${over.id}`,
        ...over,
    };
}

function buildFixture() {
    const gctx = doc({ id: 'g-ctx', type: 'ctx', content: 'GLOBAL CTX', requires_load: ['vision'] });
    const wctx = doc({ id: 'w-ctx', type: 'ctx', content: 'WEAVE CTX' });
    const vision = doc({ id: 'rf-vis', type: 'reference', slug: 'vision', content: 'VISION' });
    const refA = doc({ id: 'rf-A', type: 'reference', content: 'A', requires_load: ['rf-B'] });
    const refB = doc({ id: 'rf-B', type: 'reference', content: 'B', requires_load: ['rf-A'] }); // cycle A<->B
    const idea = doc({ id: 'i1', type: 'idea', content: 'IDEA' });
    const design = doc({ id: 'd1', type: 'design', version: 2, content: 'DESIGN' });
    const plan = doc({ id: 'p1', type: 'plan', status: 'implementing', design_version: 1, steps: [], content: 'PLAN' });
    const chat = doc({ id: 'c1', type: 'chat', content: 'CHAT', requires_load: ['rf-A', 'ghost'] });

    const thread = { id: 't1', weaveId: 'w1', idea, design, plans: [plan], dones: [], chats: [chat], refDocs: [],
        allDocs: [idea, design, plan, chat] };
    const weave = { id: 'w1', threads: [thread], looseFibers: [wctx], chats: [], refDocs: [vision, refA, refB],
        allDocs: [idea, design, plan, chat, wctx, vision, refA, refB] };

    const index = createEmptyIndex();
    for (const d of [gctx, wctx, vision, refA, refB, idea, design, plan, chat]) {
        index.byId.set(d.id, `/fake/${d.id}.md`);
    }
    index.bySlug.set('vision', 'rf-vis');

    const state: any = {
        loomRoot: '/fake', mode: 'mono', loomName: '(local)',
        globalDocs: [gctx], globalChats: [], weaves: [weave],
        archivedWeaves: [], archivedLooseDocs: [], index,
        generatedAt: '2026-05-25T00:00:00.000Z', summary: {},
    };
    return state;
}

async function run() {
    console.log('🔁 Running assembleContext tests...\n');

    const state = buildFixture();
    const bundle = assembleContext('c1', 'chat', { include: [], exclude: [] }, state);
    const ids = bundle.docs.map((d: any) => d.id);

    // ── Scope ordering ───────────────────────────────────────────────────────
    console.log('  • deterministic scope ordering...');
    assert(
        JSON.stringify(ids) === JSON.stringify(['g-ctx', 'w-ctx', 'i1', 'd1', 'p1', 'c1', 'rf-vis', 'rf-A', 'ghost', 'rf-B']),
        `Unexpected order: ${JSON.stringify(ids)}`,
    );
    assert(bundle.docs[0].scope === 'global', 'g-ctx scope should be global');
    assert(bundle.docs[1].scope === 'weave', 'w-ctx scope should be weave');
    assert(bundle.docs.find((d: any) => d.id === 'c1').scope === 'target', 'c1 scope should be target');
    console.log('    ✅ order + scopes correct');

    // ── Slug resolution via requires_load ─────────────────────────────────────
    console.log('  • requires_load resolves a slug...');
    const vis = bundle.docs.find((d: any) => d.id === 'rf-vis');
    assert(vis && vis.reason === 'requires_load' && vis.content === 'VISION', 'vision should load via slug');
    console.log('    ✅ slug "vision" → rf-vis');

    // ── Transitive + cyclic requires_load terminates, no dupes ────────────────
    console.log('  • cyclic requires_load (A<->B) terminates without duplicates...');
    assert(ids.filter((x: string) => x === 'rf-A').length === 1, 'rf-A must appear once');
    assert(ids.filter((x: string) => x === 'rf-B').length === 1, 'rf-B must appear once');
    console.log('    ✅ A and B each appear exactly once');

    // ── Missing requires_load target → placeholder + excluded ─────────────────
    console.log('  • missing requires_load target → placeholder...');
    const ghost = bundle.docs.find((d: any) => d.id === 'ghost');
    assert(ghost && ghost.missing === true && ghost.content === '', 'ghost should be a missing placeholder');
    assert(bundle.excluded.some((e: any) => e.id === 'ghost' && e.reason === 'missing'), 'ghost should be excluded:missing');
    console.log('    ✅ ghost placeholder + diagnostic');

    // ── Stale flagging ────────────────────────────────────────────────────────
    console.log('  • stale plan flagged (design_version 1 < design v2)...');
    const p1 = bundle.docs.find((d: any) => d.id === 'p1');
    assert(p1 && p1.stale && typeof p1.stale.reason === 'string', 'p1 should be flagged stale');
    console.log('    ✅ p1 flagged stale');

    // ── Token estimate ────────────────────────────────────────────────────────
    console.log('  • token estimate is ceil(chars/4)...');
    assert(bundle.docs[0].tokenEstimate === Math.ceil('GLOBAL CTX'.length / 4), 'token estimate mismatch');
    assert(bundle.totalTokens > 0, 'totalTokens should be > 0');
    console.log('    ✅ token estimate correct');

    // ── classifyScope helper ──────────────────────────────────────────────────
    console.log('  • classifyScope positional derivation...');
    assert(classifyScope('g-ctx', state) === 'global', 'g-ctx → global');
    assert(classifyScope('w-ctx', state) === 'weave', 'w-ctx → weave');
    assert(classifyScope('i1', state) === 'thread', 'i1 → thread');
    assert(classifyScope('nope', state) === null, 'unknown → null');
    console.log('    ✅ classifyScope correct');

    // ── exclude override wins ─────────────────────────────────────────────────
    console.log('  • exclude override removes a doc...');
    const excluded = assembleContext('c1', 'chat', { include: [], exclude: ['i1'] }, state);
    assert(!excluded.docs.some((d: any) => d.id === 'i1'), 'i1 should be excluded');
    assert(excluded.excluded.some((e: any) => e.id === 'i1' && e.reason === 'user-exclude'), 'i1 excluded:user-exclude');
    console.log('    ✅ exclude honoured');

    // ── missing target throws ─────────────────────────────────────────────────
    console.log('  • unknown target throws...');
    let threw = false;
    try { assembleContext('does-not-exist', 'chat', { include: [], exclude: [] }, state); } catch { threw = true; }
    assert(threw, 'unknown target must throw');
    console.log('    ✅ throws on unknown target');

    // ── serializeBundle ───────────────────────────────────────────────────────
    console.log('  • serializeBundle markdown shape...');
    const md = serializeBundle(bundle);
    assert(md.startsWith('<!-- loom:context-bundle target=c1 mode=chat docs=10'), 'leading bundle comment missing/wrong');
    assert(md.includes('### [global ctx] g-ctx · id: g-ctx'), 'global ctx header wrong');
    assert(md.includes('### [target chat] c1 · id: c1'), 'target header wrong');
    assert(md.includes('### ⚠️ requires_load target missing: ghost'), 'missing header wrong');
    assert(/### \[thread plan\] p1 · id: p1 · ⚠️ stale:/.test(md), 'stale marker missing in plan header');
    assert(md.includes('VISION') && md.includes('GLOBAL CTX'), 'doc bodies missing');
    assert(md.split('\n---\n').length >= 9, 'sections should be separated by ---');
    console.log('    ✅ serialised markdown correct');

    // ── bundleVisibilityLines ─────────────────────────────────────────────────
    console.log('  • bundleVisibilityLines from same docs[]...');
    const lines = bundleVisibilityLines(bundle);
    assert(lines.length === bundle.docs.length, 'one visibility line per doc');
    assert(lines[0] === '📄 g-ctx — loaded for context', 'first visibility line wrong');
    assert(lines.some((l: string) => l === '⚠️ requires_load target missing: ghost'), 'missing visibility line wrong');
    assert(lines.some((l: string) => l.startsWith('📄 p1 — loaded for context (⚠️ stale)')), 'stale visibility marker missing');
    console.log('    ✅ visibility lines correct');

    console.log('\n✅ assembleContext + serializeBundle tests passed\n');
}

run().catch(e => { console.error('❌', e); process.exit(1); });
