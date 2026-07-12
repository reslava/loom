import { assert } from './test-utils.ts';
import { selectReportDocs, getReportKind, deterministicExcerpt } from '../packages/core/dist';

// Pure unit tests for selectReportDocs — no filesystem, no CLI. Build a minimal
// LoomState-shaped fixture and assert deterministic selection: type ∈ kind.docTypes,
// weave/thread scoping, inclusive created date window, chronological ordering, manifest,
// and the deterministic token budget (tiered degradation, relevance, ctx-preferred summary).

function doc(type: string, id: string, created: string): any {
    return { type, id, title: id, status: 'active', created, version: 1, tags: [], parent_id: null, requires_load: [], content: `body-${id}` };
}
function docB(type: string, id: string, created: string, body: string): any {
    return { type, id, title: id, status: 'active', created, version: 1, tags: [], parent_id: null, requires_load: [], content: body };
}
/** A doc body with an H1, one section heading, and N equal content lines — so its full
 *  size scales with N while its deterministic excerpt stays bounded (first 12 lines). */
function linesBody(title: string, nLines: number): string {
    return [`# ${title}`, '', `## Overview`, '', ...Array(nLines).fill('content line here')].join('\n');
}
function thread(weaveSlug: string, id: string, arrays: any): any {
    const { idea, design, req, plans = [], dones = [], chats = [], refDocs = [] } = arrays;
    const allDocs = [idea, design, req, ...plans, ...dones, ...chats, ...refDocs].filter(Boolean);
    return { id, weaveSlug, idea, design, req, plans, dones, chats, refDocs, allDocs };
}
function weave(id: string, threads: any[], extra: any = {}): any {
    return { id, threads, looseFibers: extra.looseFibers ?? [], chats: extra.chats ?? [], refDocs: extra.refDocs ?? [], allDocs: [] };
}
function state(weaves: any[]): any {
    return { weaves, globalDocs: [], globalChats: [] };
}

async function run() {
    console.log('📑 Running selectReportDocs tests...\n');

    const daDesign = doc('design', 'da-design', '2026-01-01');
    const daChat = doc('chat', 'da-chat', '2026-02-01');
    const daDone = doc('done', 'da-done', '2026-03-01');
    const daRef = doc('reference', 'da-ref', '2026-01-05');
    const dbDesign = doc('design', 'db-design', '2026-01-15');

    const s = state([
        weave('wa', [thread('wa', 'ta', { design: daDesign, chats: [daChat], dones: [daDone] })], { refDocs: [daRef] }),
        weave('wb', [thread('wb', 'tb', { design: dbDesign })]),
    ]);

    const decisions = getReportKind('decisions')!;      // chat + design
    const architecture = getReportKind('architecture')!; // design + reference

    // 1. decisions selects chats + designs across weaves, chronological, with manifest.
    {
        const sel = selectReportDocs(s, decisions, {});
        assert(sel.docs.length === 3, `decisions selects 3 (2 design + 1 chat), got ${sel.docs.length}`);
        assert(sel.docs.map(d => d.id).join(',') === 'da-design,db-design,da-chat', `chronological order, got ${sel.docs.map(d => d.id).join(',')}`);
        assert(sel.manifest.counts.design === 2 && sel.manifest.counts.chat === 1, 'manifest counts by type');
        assert(!sel.docs.some(d => d.type === 'done' || d.type === 'reference'), 'excludes types not in kind.docTypes');
        assert(sel.manifest.fullChars > 0 && !sel.manifest.budgeted, 'small slice reports full-body chars and is not budgeted');
        assert(sel.docs.every(d => d.tier === 'full'), 'small slice: every doc emitted at full tier');
        console.log('  ✅ decisions: chat+design, chronological, type-filtered, manifest, all-full');
    }

    // 2. weave filter scopes to one weave.
    {
        const sel = selectReportDocs(s, decisions, { weaves: ['wa'] });
        assert(sel.docs.length === 2 && sel.docs.every(d => d.weaveSlug === 'wa'), `weave filter keeps only wa (2 docs), got ${sel.docs.length}`);
        console.log('  ✅ weave filter');
    }

    // 3. thread filter scopes to one thread.
    {
        const sel = selectReportDocs(s, decisions, { threads: ['tb'] });
        assert(sel.docs.length === 1 && sel.docs[0].id === 'db-design', 'thread filter keeps only tb');
        console.log('  ✅ thread filter');
    }

    // 4. date window (inclusive) on created.
    {
        const from = selectReportDocs(s, decisions, { from: '2026-01-10' });
        assert(from.docs.map(d => d.id).sort().join(',') === 'da-chat,db-design', `from drops da-design, got ${from.docs.map(d => d.id).join(',')}`);
        const window = selectReportDocs(s, decisions, { from: '2026-01-01', to: '2026-01-31' });
        assert(window.docs.map(d => d.id).sort().join(',') === 'da-design,db-design', `window keeps Jan designs, got ${window.docs.map(d => d.id).join(',')}`);
        console.log('  ✅ date window (from/to inclusive)');
    }

    // 5. architecture selects design + reference (incl. the weave-level ref); excludes chat.
    {
        const sel = selectReportDocs(s, architecture, {});
        assert(sel.docs.some(d => d.id === 'da-ref'), 'architecture includes the weave-level reference');
        assert(sel.docs.some(d => d.type === 'design'), 'architecture includes designs');
        assert(!sel.docs.some(d => d.type === 'chat'), 'architecture excludes chats');
        console.log('  ✅ architecture: design+reference (weave-level ref picked up)');
    }

    // --- Token budget (C-2) ----------------------------------------------------------
    // Three equal-sized designs across three threads, distinct dates (d3 newest). Equal
    // sizes make greedy packing a clean prefix, so degradation is monotonic and testable.
    const b1 = linesBody('D1', 400);
    const b2 = linesBody('D2', 400);
    const b3 = linesBody('D3', 400);
    const bodyLen = b1.length;
    const exLen = deterministicExcerpt(b2).length; // bounded excerpt size (first 12 lines)
    const budgetState = state([
        weave('wa', [
            thread('wa', 't1', { design: docB('design', 'd1', '2026-01-01', b1) }),
            thread('wa', 't2', { design: docB('design', 'd2', '2026-02-01', b2) }),
            thread('wa', 't3', { design: docB('design', 'd3', '2026-03-01', b3) }),
        ]),
    ]);

    // 6. Within budget → all full, not budgeted, full bodies emitted verbatim.
    {
        const sel = selectReportDocs(budgetState, decisions, {}, bodyLen * 3 + 100);
        assert(!sel.manifest.budgeted, 'generous budget: not budgeted');
        assert(sel.manifest.tiers.full === 3 && sel.manifest.tiers.summary === 0 && sel.manifest.tiers.reference === 0, 'all full');
        assert(sel.docs.every(d => d.tier === 'full'), 'every doc full tier');
        assert(sel.docs.find(d => d.id === 'd2')!.body === b2, 'full body emitted verbatim');
        assert(sel.manifest.fullChars === bodyLen * 3 && sel.manifest.emittedChars === bodyLen * 3, 'chars: full == emitted when within budget');
        console.log('  ✅ budget: within budget keeps full bodies');
    }

    // 7. Degradation order full → summary → reference, driven by relevance (recent first).
    {
        const midBudget = bodyLen + exLen + 10; // fits one full + one excerpt, not a second full
        const sel = selectReportDocs(budgetState, decisions, {}, midBudget);
        const tierOf = Object.fromEntries(sel.docs.map(d => [d.id, d.tier]));
        assert(sel.manifest.budgeted, 'oversized slice is budgeted');
        assert(tierOf['d3'] === 'full', 'most-recent doc keeps full body');
        assert(tierOf['d2'] === 'summary', 'next-most-recent degrades to summary');
        assert(tierOf['d1'] === 'reference', 'oldest degrades to reference-only');
        assert(sel.manifest.tiers.full === 1 && sel.manifest.tiers.summary === 1 && sel.manifest.tiers.reference === 1, 'one doc per tier');
        // manifest accounting
        assert(sel.manifest.fullChars === bodyLen * 3, 'fullChars = sum of ALL full bodies (pre-budget)');
        assert(sel.manifest.emittedChars < sel.manifest.fullChars, 'degradation shrinks emitted chars below the full slice size');
        // Full + summary content is bounded by the budget; reference markers are a small
        // metadata floor on top (not counted against the budget).
        const heavyChars = sel.docs.filter(d => d.tier !== 'reference').reduce((n, d) => n + d.body.length, 0);
        assert(heavyChars <= sel.manifest.maxChars, 'full+summary content stays within budget');
        assert(sel.manifest.tiers.full + sel.manifest.tiers.summary + sel.manifest.tiers.reference === sel.manifest.totalDocs, 'tier counts sum to totalDocs');
        assert(typeof sel.manifest.elision === 'string' && /full.*summarized.*referenced/.test(sel.manifest.elision), 'elision names all three tiers');
        // output stays chronological even though budget allocation used relevance order
        assert(sel.docs.map(d => d.id).join(',') === 'd1,d2,d3', 'output order is chronological');
        console.log('  ✅ budget: full→summary→reference by relevance, chronological output, elision');
    }

    // 8. Determinism: identical inputs → byte-identical tier sequence and bodies.
    {
        const budget = bodyLen + exLen + 10;
        const a = selectReportDocs(budgetState, decisions, {}, budget);
        const b = selectReportDocs(budgetState, decisions, {}, budget);
        assert(JSON.stringify(a.docs) === JSON.stringify(b.docs), 'same input → identical docs/tiers/bodies');
        assert(JSON.stringify(a.manifest) === JSON.stringify(b.manifest), 'same input → identical manifest');
        console.log('  ✅ budget: deterministic (no AI, pure)');
    }

    // 9. Shrinking the budget only ever downgrades tiers (never upgrades).
    {
        const t = (budget: number) => selectReportDocs(budgetState, decisions, {}, budget).manifest.tiers;
        assert(t(bodyLen * 3 + 100).full === 3, 'generous: 3 full');
        assert(t(bodyLen + exLen + 10).full === 1, 'mid: 1 full');
        const tiny = t(bodyLen + 5);
        assert(tiny.full === 1 && tiny.summary + tiny.reference === 2, 'tiny: only the single most-recent stays full');
        console.log('  ✅ budget: degradation monotonic as budget shrinks');
    }

    // 10. Summary tier prefers an existing scope ctx over the deterministic excerpt.
    {
        const big = linesBody('Big', 400);
        const ctxDoc = docB('ctx', 'wa-ctx', '2026-01-01', '# WA Context\n\nweave wa summary text.');
        const s4 = state([
            // wa HAS a weave ctx (in looseFibers); its design is the newest.
            weave('wa', [thread('wa', 'ta', { design: docB('design', 'd-wa', '2026-03-01', big) })], { looseFibers: [ctxDoc] }),
            // wb has NO ctx; its design is older.
            weave('wb', [thread('wb', 'tb', { design: docB('design', 'd-wb', '2026-02-01', big) })]),
        ]);
        // Budget forces BOTH designs off full; both summaries fit.
        const sel = selectReportDocs(s4, decisions, {}, 800);
        const waDoc = sel.docs.find(d => d.id === 'd-wa')!;
        const wbDoc = sel.docs.find(d => d.id === 'd-wb')!;
        assert(waDoc.tier === 'summary' && wbDoc.tier === 'summary', 'both designs degrade to summary');
        assert(waDoc.body.includes('ctx used in place') && waDoc.body.includes('weave wa summary text'), 'wa uses its scope ctx as the summary');
        assert(wbDoc.body.includes('full body elided for budget') && !wbDoc.body.includes('ctx used in place'), 'wb (no ctx) falls back to the excerpt');
        // ctx doc itself is a summary SOURCE, never a selected report doc.
        assert(!sel.docs.some(d => d.type === 'ctx'), 'ctx doc is not itself selected into the slice');
        console.log('  ✅ budget: summary prefers scope ctx, else excerpt');
    }

    // --- Kind registry (coverage & kinds) --------------------------------------------
    // 11. New single-doc-type kinds, ctx placement, budgets, roadmap kinds untouched.
    {
        const k = (s: string) => getReportKind(s)!;
        assert(k('ideas').docTypes.join(',') === 'idea,ctx', `ideas reads idea+ctx, got ${k('ideas').docTypes.join(',')}`);
        assert(k('designs').docTypes.join(',') === 'design,ctx', 'designs reads design+ctx');
        assert(k('plans').docTypes.join(',') === 'plan,ctx', 'plans reads plan+ctx');
        assert(k('dones').docTypes.join(',') === 'done,ctx', 'dones reads done+ctx');
        assert([k('ideas'), k('designs'), k('plans'), k('dones')].every(x => x.maxChars === 150000), 'single-doc-type kinds carry the higher 150k budget');
        assert(k('architecture').docTypes.includes('ctx'), 'architecture (summary-friendly) includes ctx');
        assert(!k('decisions').docTypes.includes('ctx') && !k('drift-audit').docTypes.includes('ctx') && !k('security').docTypes.includes('ctx'), 'analytical kinds stay ctx-free');
        assert(k('project-overview').docTypes.length === 0 && k('release-notes').docTypes.length === 0, 'roadmap kinds keep empty docTypes');
        console.log('  ✅ registry: new kinds, ctx placement, 150k budgets, roadmap untouched');
    }

    // 12. --full (unlimited budget) disables degradation that a small budget would apply.
    {
        const small = selectReportDocs(budgetState, decisions, {}, bodyLen + 50);
        assert(small.manifest.budgeted, 'small budget degrades the same slice');
        const unlimited = selectReportDocs(budgetState, decisions, {}, Infinity);
        assert(!unlimited.manifest.budgeted, 'unlimited budget: not budgeted');
        assert(unlimited.docs.every(d => d.tier === 'full'), 'unlimited budget: every doc full');
        assert(unlimited.manifest.emittedChars === unlimited.manifest.fullChars, 'unlimited: emitted == full');
        assert(!Number.isFinite(unlimited.manifest.maxChars), 'manifest records an unlimited budget');
        console.log('  ✅ budget: --full (Infinity) disables degradation');
    }

    // 13. oversizedWeavesWithoutCtx hint: only degraded weaves that lack a ctx.
    {
        const big = linesBody('Big', 400);
        const ctxDoc = docB('ctx', 'wa-ctx', '2026-01-01', '# WA Context\n\nweave wa summary.');
        const s5 = state([
            weave('wa', [thread('wa', 'ta', { design: docB('design', 'd-wa', '2026-03-01', big) })], { looseFibers: [ctxDoc] }),
            weave('wb', [thread('wb', 'tb', { design: docB('design', 'd-wb', '2026-02-01', big) })]),
        ]);
        const degraded = selectReportDocs(s5, decisions, {}, 800); // both designs degrade
        assert(degraded.manifest.oversizedWeavesWithoutCtx.join(',') === 'wb',
            `hint lists only the ctx-less degraded weave, got [${degraded.manifest.oversizedWeavesWithoutCtx.join(',')}]`);
        const roomy = selectReportDocs(s5, decisions, {}, big.length * 2 + 1000); // nothing degrades
        assert(!roomy.manifest.budgeted && roomy.manifest.oversizedWeavesWithoutCtx.length === 0, 'no degradation → empty hint');
        console.log('  ✅ budget: oversized-weave-without-ctx hint');
    }

    console.log('\n✅ selectReportDocs tests passed');
}

run().catch(e => { console.error('❌', e); process.exit(1); });
