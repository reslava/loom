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

// Dedicated fixture for the Phase-2 load / load_when matrix (kept separate so the
// Phase-1 ordering assertions above are not disturbed by auto-loaded references).
function buildLoadFixture() {
    const refAlways = doc({ id: 'r-always', type: 'reference', slug: 'r-always', load: 'always', content: 'ALWAYS' });
    const refDesign = doc({ id: 'r-design', type: 'reference', slug: 'r-design', load: 'always', load_when: ['design'], content: 'DESIGN-REF' });
    const refByReq  = doc({ id: 'r-byreq',  type: 'reference', slug: 'r-byreq',  load: 'by-request', content: 'BYREQ' });

    const designT = doc({ id: 'd-T', type: 'design', content: 'DESIGN-T' });
    const chatT   = doc({ id: 'c-T', type: 'chat', content: 'CHAT-T', requires_load: ['r-byreq'] });

    const thread = { id: 't1', weaveId: 'w1', idea: undefined, design: designT, plans: [], dones: [], chats: [chatT], refDocs: [],
        allDocs: [designT, chatT] };
    const weave = { id: 'w1', threads: [thread], looseFibers: [], chats: [], refDocs: [refAlways, refDesign, refByReq],
        allDocs: [designT, chatT, refAlways, refDesign, refByReq] };

    const index = createEmptyIndex();
    for (const d of [refAlways, refDesign, refByReq, designT, chatT]) {
        index.byId.set(d.id, `/fake/${d.id}.md`);
    }

    const state: any = {
        loomRoot: '/fake', mode: 'mono', loomName: '(local)',
        globalDocs: [], globalChats: [], weaves: [weave],
        archivedWeaves: [], archivedLooseDocs: [], index,
        generatedAt: '2026-05-27T00:00:00.000Z', summary: {},
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

    // ── requires_load wins over user-exclude (design §5) → ⊘ + requiredBy ─────
    console.log('  • excluding a requires_load target → overridden, not dropped...');
    // c1.requires_load includes rf-A; excluding rf-A must NOT drop it (c1 needs it).
    const overridden = assembleContext('c1', 'chat', { include: [], exclude: ['rf-A'] }, state);
    const rfA = overridden.docs.find((d: any) => d.id === 'rf-A');
    assert(!!rfA, 'rf-A must still be in the bundle (required by c1)');
    assert(rfA.reason === 'user-exclude-overridden', 'rf-A reason should be user-exclude-overridden');
    assert(typeof rfA.requiredBy === 'string' && rfA.requiredBy.length > 0, 'rf-A should carry requiredBy');
    assert(!overridden.excluded.some((e: any) => e.id === 'rf-A'), 'rf-A must not also appear in excluded[]');
    console.log('    ✅ requires_load overrides exclude; surfaced as ⊘ + requiredBy');

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

    // ── load / load_when filter (Phase 2) ─────────────────────────────────────
    console.log('  • load/load_when filter (Phase 2)...');
    const ls = buildLoadFixture();

    // design mode: always ref + design-scoped always ref auto-load; by-request only via requires_load.
    const designB = assembleContext('c-T', 'design', { include: [], exclude: [] }, ls);
    const dIds = designB.docs.map((d: any) => d.id);
    assert(dIds.includes('r-always'), 'r-always should auto-load in design mode');
    assert(dIds.includes('r-design'), 'r-design (load_when:[design]) should auto-load in design mode');
    assert(designB.docs.find((d: any) => d.id === 'r-always').reason === 'auto', 'r-always reason should be auto');
    assert(designB.docs.find((d: any) => d.id === 'r-design').reason === 'auto', 'r-design reason should be auto');
    const dByReq = designB.docs.find((d: any) => d.id === 'r-byreq');
    assert(dByReq && dByReq.reason === 'requires_load', 'r-byreq should load via requires_load, not auto');
    assert(!designB.excluded.some((e: any) => e.id === 'r-design'), 'r-design must not be excluded in design mode');
    console.log('    ✅ design mode: always + design-scoped auto-load; by-request via requires_load');

    // implementing mode: design-scoped always ref is filtered out (load_when-filter).
    const implB = assembleContext('c-T', 'implementing', { include: [], exclude: [] }, ls);
    const iIds = implB.docs.map((d: any) => d.id);
    assert(iIds.includes('r-always'), 'r-always (no load_when) should auto-load in every mode');
    assert(!iIds.includes('r-design'), 'r-design should be filtered out in implementing mode');
    assert(implB.excluded.some((e: any) => e.id === 'r-design' && e.reason === 'load_when-filter'),
        'r-design should be excluded:load_when-filter in implementing mode');
    assert(iIds.includes('r-byreq'), 'r-byreq should still load via requires_load in implementing mode');
    console.log('    ✅ implementing mode: design-scoped ref dropped (load_when-filter)');

    // by-request is excluded from auto-load when nothing requires it (design target has no requires_load).
    const noReqB = assembleContext('d-T', 'design', { include: [], exclude: [] }, ls);
    const nIds = noReqB.docs.map((d: any) => d.id);
    assert(nIds.includes('r-always') && nIds.includes('r-design'), 'always refs auto-load for the design target');
    assert(!nIds.includes('r-byreq'), 'by-request ref must NOT auto-load when unreferenced');
    console.log('    ✅ by-request excluded from auto-load when unreferenced');

    // refine mode filters by the target's type (design §8): refine on a design → design-scoped ref loads.
    const refineB = assembleContext('d-T', 'refine', { include: [], exclude: [] }, ls);
    const rIds = refineB.docs.map((d: any) => d.id);
    assert(rIds.includes('r-design'), 'refine on a design target should include the design-scoped ref');
    assert(rIds.includes('r-always'), 'refine on a design target should include the unconditional always ref');
    console.log('    ✅ refine mode filters by target type');

    // ── req spec is injected first in a thread, before the idea ───────────────
    console.log('  • req is injected before the idea (thread always-load slot)...');
    {
        const idea = doc({ id: 'i9', type: 'idea', content: 'IDEA-9' });
        const req = doc({ id: 'rq_9', type: 'req', status: 'locked', content: 'REQ-SPEC' });
        const chat = doc({ id: 'c9', type: 'chat', content: 'CHAT-9' });
        const thread = {
            id: 't9', weaveId: 'w9', idea, req, design: undefined,
            plans: [], dones: [], chats: [chat], refDocs: [], allDocs: [idea, req, chat],
        };
        const weave = { id: 'w9', threads: [thread], looseFibers: [], chats: [], refDocs: [], allDocs: [idea, req, chat] };
        const index = createEmptyIndex();
        for (const d of [idea, req, chat]) index.byId.set(d.id, `/fake/${d.id}.md`);
        const reqState: any = {
            loomRoot: '/fake', mode: 'mono', loomName: '(local)',
            globalDocs: [], globalChats: [], weaves: [weave],
            archivedWeaves: [], archivedLooseDocs: [], index,
            generatedAt: '2026-06-05T00:00:00.000Z', summary: {},
        };

        const b = assembleContext('c9', 'chat', { include: [], exclude: [] }, reqState);
        const order = b.docs.map((d: any) => d.id);
        const reqIdx = order.indexOf('rq_9');
        const ideaIdx = order.indexOf('i9');
        assert(reqIdx !== -1, 'req must be present in the bundle');
        assert(reqIdx < ideaIdx, `req must come before the idea, got: ${JSON.stringify(order)}`);
        const reqDoc = b.docs.find((d: any) => d.id === 'rq_9');
        assert(reqDoc.scope === 'thread' && reqDoc.reason === 'auto', 'req scope=thread reason=auto');
        // When the req IS the target (e.g. curating it), it is not double-added.
        const self = assembleContext('rq_9', 'chat', { include: [], exclude: [] }, reqState);
        assert(self.docs.filter((d: any) => d.id === 'rq_9').length === 1, 'req target must appear exactly once');
        console.log('    ✅ req injected before idea; not double-added when it is the target');
    }

    // ── req-staleness surfaced in the bundle (design built against an older locked req) ──
    console.log('  • a design built against an older locked req is flagged stale...');
    {
        const req = doc({ id: 'rq_s', type: 'req', status: 'locked', version: 2, content: 'REQ' });
        const design = doc({ id: 'd-s', type: 'design', version: 1, req_version: 1, content: 'DESIGN' });
        const chat = doc({ id: 'c-s', type: 'chat', content: 'CHAT' });
        const thread = {
            id: 'ts', weaveId: 'ws', idea: undefined, design, req,
            plans: [], dones: [], chats: [chat], refDocs: [], allDocs: [design, req, chat],
        };
        const weave = { id: 'ws', threads: [thread], looseFibers: [], chats: [], refDocs: [], allDocs: [design, req, chat] };
        const index = createEmptyIndex();
        for (const d of [req, design, chat]) index.byId.set(d.id, `/fake/${d.id}.md`);
        const sState: any = {
            loomRoot: '/fake', mode: 'mono', loomName: '(local)',
            globalDocs: [], globalChats: [], weaves: [weave],
            archivedWeaves: [], archivedLooseDocs: [], index,
            generatedAt: '2026-06-05T00:00:00.000Z', summary: {},
        };
        const b = assembleContext('c-s', 'chat', { include: [], exclude: [] }, sState);
        const designDoc = b.docs.find((d: any) => d.id === 'd-s');
        assert(designDoc && designDoc.stale && /req v2/.test(designDoc.stale.reason), `design should be req-stale, got ${JSON.stringify(designDoc?.stale)}`);
        console.log('    ✅ req-stale design flagged in the bundle');
    }

    console.log('\n✅ assembleContext + serializeBundle tests passed\n');
}

run().catch(e => { console.error('❌', e); process.exit(1); });
