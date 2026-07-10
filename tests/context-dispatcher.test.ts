import * as path from 'path';
import * as os from 'os';
import { remove, ensureDir, outputFile } from 'fs-extra';
import { assert, createPlanDoc, createDesignDoc } from './test-utils.ts';
import { assembleContext } from '../packages/app/dist/context/assembleContext.js';
import { createEmptyIndex } from '../packages/core/dist/linkIndex.js';
import { handle as doStepHandle } from '../packages/mcp/dist/tools/doStep.js';
import { handleContextResource } from '../packages/mcp/dist/resources/context.js';

// ---------------------------------------------------------------------------
// Context Dispatcher (model C) — the dedupe + no-silent-under-load invariants.
//
// Two layers:
//   1. Pure assembleContext unit tests against a hand-built LoomState (no IO):
//      empty ledger → full bundle; full ledger → ~0 delta; version bump →
//      re-injected; manifest lists assumed-present; slug in ledger resolves.
//   2. A loom_do_step / loom://context round-trip over a hermetic on-disk
//      workspace, proving the `alreadyLoaded` param threads through the door.
// ---------------------------------------------------------------------------

function doc(over: any): any {
    return {
        id: over.id,
        type: over.type,
        title: over.title ?? over.id,
        status: over.status ?? 'active',
        created: '2026-06-11',
        version: over.version ?? 1,
        tags: [],
        parent_id: null,
        requires_load: over.requires_load ?? [],
        content: over.content ?? `BODY:${over.id}`,
        ...over,
    };
}

// A thread bundle with global + weave ctx, idea, design (v2), plan, a chat
// target whose requires_load pulls a slug ref + a missing placeholder.
function buildFixture() {
    const gctx = doc({ id: 'g-ctx', type: 'ctx', content: 'GLOBAL CTX' });
    const wctx = doc({ id: 'w-ctx', type: 'ctx', content: 'WEAVE CTX' });
    const vision = doc({ id: 'rf-vis', type: 'reference', slug: 'vision', content: 'VISION' });
    const idea = doc({ id: 'i1', type: 'idea', content: 'IDEA' });
    const design = doc({ id: 'd1', type: 'design', version: 2, content: 'DESIGN' });
    const plan = doc({ id: 'p1', type: 'plan', status: 'implementing', design_version: 1, steps: [], content: 'PLAN' });
    const chat = doc({ id: 'c1', type: 'chat', content: 'CHAT', requires_load: ['vision', 'ghost'] });

    const thread = {
        id: 't1', weaveSlug: 'w1', idea, design, plans: [plan], dones: [], chats: [chat], refDocs: [],
        allDocs: [idea, design, plan, chat],
    };
    const weave = {
        id: 'w1', threads: [thread], looseFibers: [wctx], chats: [], refDocs: [vision],
        allDocs: [idea, design, plan, chat, wctx, vision],
    };

    const index = createEmptyIndex();
    for (const d of [gctx, wctx, vision, idea, design, plan, chat]) index.byId.set(d.id, `/fake/${d.id}.md`);
    index.bySlug.set('vision', 'rf-vis');

    const state: any = {
        loomRoot: '/fake', mode: 'mono', loomName: '(local)',
        globalDocs: [gctx], globalChats: [], weaves: [weave],
        archivedWeaves: [], archivedLooseDocs: [], index,
        generatedAt: '2026-06-11T00:00:00.000Z', summary: {},
    };
    return state;
}

const NONE = { include: [], exclude: [] };

async function pureTests() {
    console.log('🧮 Pure assembleContext dedupe tests...\n');
    const state = buildFixture();

    // ── empty/new-session ledger → full bundle, empty manifest ────────────────
    console.log('  • empty ledger → full bundle + empty manifest...');
    const full = assembleContext('c1', 'chat', NONE, state);
    const fullIds = full.docs.map((d: any) => d.id);
    assert(
        JSON.stringify(fullIds) === JSON.stringify(['g-ctx', 'w-ctx', 'i1', 'd1', 'p1', 'c1', 'rf-vis', 'ghost']),
        `unexpected full bundle: ${JSON.stringify(fullIds)}`,
    );
    assert(Array.isArray(full.manifest) && full.manifest.length === 0, 'manifest must be empty for an empty ledger');
    // omitting the 5th arg must behave identically to passing []
    const fullDefault = assembleContext('c1', 'chat', NONE, state, []);
    assert(fullDefault.docs.length === full.docs.length, 'default [] ledger must equal omitted ledger');
    // every emitted doc carries its version; the missing placeholder carries 0
    assert(full.docs.every((d: any) => typeof d.version === 'number'), 'every bundled doc must carry a version');
    assert(full.docs.find((d: any) => d.id === 'ghost').version === 0, 'missing placeholder version must be 0');
    console.log('    ✅ full bundle, empty manifest, versions present');

    // ── same-session, nothing changed → ~0 delta, manifest lists all ──────────
    console.log('  • full ledger (no change) → 0 delta, manifest lists all...');
    const ledgerAll = full.docs.map((d: any) => ({ id: d.id, version: d.version }));
    const deduped = assembleContext('c1', 'chat', NONE, state, ledgerAll);
    assert(deduped.docs.length === 0, `delta must be empty, got ${JSON.stringify(deduped.docs.map((d: any) => d.id))}`);
    assert(deduped.totalTokens === 0, 'totalTokens of an empty delta must be 0');
    assert(deduped.manifest.length === ledgerAll.length, 'manifest must list every assumed-present doc');
    const manifestIds = deduped.manifest.map((m: any) => m.id).sort();
    assert(JSON.stringify(manifestIds) === JSON.stringify([...fullIds].sort()), 'manifest must cover exactly the resolved set');
    console.log('    ✅ 0 delta; manifest = assumed-present set');

    // ── a doc whose version bumped → re-injected (NO silent under-load) ────────
    console.log('  • stale ledger entry (version bump) → doc re-injected...');
    // declare every doc at its real version EXCEPT d1, declared at an old v1 (current is v2)
    const staleLedger = ledgerAll.map((e: any) => (e.id === 'd1' ? { id: 'd1', version: 1 } : e));
    const reinjected = assembleContext('c1', 'chat', NONE, state, staleLedger);
    const reIds = reinjected.docs.map((d: any) => d.id);
    assert(JSON.stringify(reIds) === JSON.stringify(['d1']), `only the changed doc must re-inject, got ${JSON.stringify(reIds)}`);
    assert(reinjected.docs[0].version === 2, 'the re-injected doc must be the CURRENT version');
    assert(!reinjected.manifest.some((m: any) => m.id === 'd1'), 'a re-injected doc must not be in the manifest');
    assert(reinjected.manifest.length === ledgerAll.length - 1, 'every unchanged doc stays assumed-present');
    console.log('    ✅ version bump re-injects current doc; no silent under-load');

    // ── a slug declared in the ledger resolves to its canonical id ────────────
    console.log('  • slug in the ledger matches its canonical doc...');
    // 'vision' is the slug of rf-vis@1 — declaring it must suppress rf-vis
    const slugLedger = assembleContext('c1', 'chat', NONE, state, [{ id: 'vision', version: 1 }]);
    assert(!slugLedger.docs.some((d: any) => d.id === 'rf-vis'), 'rf-vis must be suppressed via its slug declaration');
    assert(slugLedger.manifest.some((m: any) => m.id === 'rf-vis' && m.version === 1), 'rf-vis must appear in the manifest');
    // and nothing else was suppressed
    assert(slugLedger.docs.length === full.docs.length - 1, 'only the slug-declared doc is suppressed');
    console.log('    ✅ slug declaration resolves to canonical id');

    console.log('\n✅ pure dedupe invariants hold\n');
}

// ---------------------------------------------------------------------------
// Round-trip: drive the real MCP loom_do_step handler + loom://context resource
// against a hermetic on-disk workspace.
// ---------------------------------------------------------------------------

const TMP = path.join(os.tmpdir(), 'loom-context-dispatcher-tests');

async function makeWorkspace() {
    await remove(TMP);
    await ensureDir(path.join(TMP, '.loom'));
    await outputFile(path.join(TMP, '.loom', 'workflow.yml'), 'version: 1\n');
    const weaveSlug = 'cd-weave';
    const weavePath = path.join(TMP, 'loom', weaveSlug);
    const stem = `${weaveSlug}-plan-001`;
    // The plan's identity is a stable pl_ ULID (strict API contract); the filename stays
    // the human plan stem. do_step / the context resource address it by the ULID.
    const planUlid = 'pl_CTXDISPATCH0000000000000001';
    // design lives in the same thread (threadSlug == weaveSlug) so the plan bundle includes it
    await createDesignDoc(weavePath, weaveSlug, { threadSlug: weaveSlug, status: 'active' });
    await createPlanDoc(weavePath, stem, { status: 'implementing', id: planUlid } as any);
    return { root: TMP, planId: planUlid };
}

function parseBrief(res: any) {
    return JSON.parse(res.content[0].text);
}

async function roundTripTests() {
    console.log('🔁 loom_do_step / loom://context round-trip...\n');
    const { root, planId } = await makeWorkspace();

    // ── first touch: full bundle, no ledger ───────────────────────────────────
    console.log('  • first do_step call injects the full bundle...');
    const brief1 = parseBrief(await doStepHandle(root, { plan_ulid: planId, stepNumber: 1 }));
    assert(brief1.contextSkipped === false, 'first call must not be skipped');
    assert(Array.isArray(brief1.contextManifest) && brief1.contextManifest.length === 0, 'first call manifest must be empty');
    assert(typeof brief1.threadContext === 'string' && brief1.threadContext.includes('id: ' + planId), 'bundle must contain the plan');
    console.log('    ✅ full bundle delivered, empty manifest');

    // derive the ledger from the structured resource bundle
    const jsonRes = await handleContextResource(root, `loom://context/${planId}?mode=implementing&format=json`);
    const fullBundle = JSON.parse(jsonRes.contents[0].text);
    const ledger = fullBundle.docs.map((d: any) => ({ id: d.id, version: d.version }));
    assert(ledger.length >= 2, `bundle should hold the design + plan, got ${JSON.stringify(ledger)}`);

    // ── second touch, full ledger declared → 0 delta, manifest covers all ─────
    console.log('  • re-call with the full ledger → empty delta + manifest covers all...');
    const brief2 = parseBrief(await doStepHandle(root, { plan_ulid: planId, stepNumber: 1, alreadyLoaded: ledger }));
    assert(brief2.contextManifest.length === ledger.length, 'manifest must list every assumed-present doc');
    assert(brief2.threadContext.includes('docs=0'), `delta should be empty (docs=0), got header: ${brief2.threadContext.slice(0, 80)}`);
    assert(brief2.threadContext.length < brief1.threadContext.length, 'deduped context must be shorter than the full bundle');
    console.log('    ✅ same-session re-call injects ~0 redundant context');

    // ── coarse skip flag suppresses the whole bundle ──────────────────────────
    console.log('  • context:"skip" suppresses the bundle entirely...');
    const brief3 = parseBrief(await doStepHandle(root, { plan_ulid: planId, stepNumber: 1, context: 'skip' }));
    assert(brief3.contextSkipped === true, 'skip flag must set contextSkipped');
    assert(/suppressed/i.test(brief3.threadContext), 'skip flag must replace the bundle with a suppression marker');
    console.log('    ✅ skip shortcut suppresses the bundle');

    // ── resource: a stale ledger entry re-injects only that doc ───────────────
    console.log('  • loom://context with a version-bumped ledger entry re-injects that doc...');
    // declare everything at its real version except the first doc, at a bogus version
    const staleQuery = ledger
        .map((e: any, i: number) => `${encodeURIComponent(e.id)}@${i === 0 ? 99999 : e.version}`)
        .join(',');
    const staleRes = await handleContextResource(
        root,
        `loom://context/${planId}?mode=implementing&format=json&loaded=${staleQuery}`,
    );
    const staleBundle = JSON.parse(staleRes.contents[0].text);
    const staleIds = staleBundle.docs.map((d: any) => d.id);
    assert(staleIds.length === 1 && staleIds[0] === ledger[0].id, `only the changed doc re-injects, got ${JSON.stringify(staleIds)}`);
    assert(staleBundle.manifest.length === ledger.length - 1, 'every unchanged doc stays assumed-present');
    assert(!staleBundle.manifest.some((m: any) => m.id === ledger[0].id), 'the re-injected doc must not be in the manifest');
    console.log('    ✅ resource dedupes per {id@version}; no silent under-load');

    await remove(TMP);
    console.log('\n✅ round-trip invariants hold\n');
}

async function run() {
    await pureTests();
    await roundTripTests();
    console.log('✨ context-dispatcher tests passed!\n');
}

run().catch(e => { console.error('❌ context-dispatcher.test.ts failed:', e); process.exit(1); });
