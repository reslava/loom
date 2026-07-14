import { assert } from './test-utils.ts';
import { selectReportDocs, getReportKind, deterministicExcerpt, buildReleaseNotesBrief } from '../packages/core/dist';
import { renderSelection, renderReleaseNotes } from '../packages/mcp/dist/prompts/report';

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

    // 11b. release-notes framing carries the A/C/F + Highlights structure (the do-release draft
    //      shape) while staying roadmap-passthrough — the enrichment lives skill-side, never here.
    {
        const rn = getReportKind('release-notes')!;
        assert(rn.docTypes.length === 0, 'release-notes stays roadmap-passthrough (docTypes empty)');
        const f = rn.promptFraming;
        assert(/### Added/.test(f) && /### Changed/.test(f) && /### Fixed/.test(f), 'framing sub-structures each version as Added/Changed/Fixed');
        assert(/Highlights/.test(f), 'framing leads each version with a Highlights summary');
        assert(/Unreleased/.test(f), 'framing keeps the Unreleased (release==null) bucket');
        assert(/benefit voice/.test(f), 'framing asks for user-facing benefit voice, not plan titles');
        console.log('  ✅ release-notes: A/C/F + Highlights framing, passthrough preserved');
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

    // --- Keep-full ordering (recency vs oldest) --------------------------------------
    // Reuse budgetState (d1 oldest … d3 newest, equal sizes) and the mid budget that fits
    // exactly one full + one summary.
    const midBudget = bodyLen + exLen + 10;

    // 14. sort='oldest' is the inverse of recency: the OLDEST doc keeps its full body, the
    //     NEWEST degrades to reference. Output stays chronological; manifest records the sort.
    {
        const recency = selectReportDocs(budgetState, decisions, {}, midBudget, 'recency');
        const oldest = selectReportDocs(budgetState, decisions, {}, midBudget, 'oldest');
        const rt = Object.fromEntries(recency.docs.map(d => [d.id, d.tier]));
        const ot = Object.fromEntries(oldest.docs.map(d => [d.id, d.tier]));
        assert(rt['d3'] === 'full' && rt['d1'] === 'reference', 'recency: newest full, oldest reference');
        assert(ot['d1'] === 'full' && ot['d3'] === 'reference', 'oldest: oldest full, newest reference (inverse of recency)');
        assert(ot['d2'] === 'summary', 'oldest: middle doc still degrades to summary');
        assert(oldest.docs.map(d => d.id).join(',') === 'd1,d2,d3', 'oldest: OUTPUT order stays chronological');
        assert(recency.manifest.sort === 'recency' && oldest.manifest.sort === 'oldest', 'manifest records the effective sort');
        console.log('  ✅ sort: oldest keeps oldest full (inverse of recency), chronological output, manifest.sort');
    }

    // 15. Per-kind defaultSort is applied when no explicit sort is passed: `designs`→oldest
    //     (foundational stays full), `decisions`→recency (newest stays full). Same fixture.
    {
        assert(getReportKind('designs')!.defaultSort === 'oldest', 'designs kind defaults to oldest');
        assert(getReportKind('decisions')!.defaultSort === 'recency', 'decisions kind defaults to recency');
        const designs = getReportKind('designs')!; // design + ctx; budgetState has 3 designs
        const byDesigns = selectReportDocs(budgetState, designs, {}, midBudget);
        const byDecisions = selectReportDocs(budgetState, decisions, {}, midBudget);
        assert(byDesigns.manifest.sort === 'oldest' && Object.fromEntries(byDesigns.docs.map(d => [d.id, d.tier]))['d1'] === 'full',
            'designs (defaultSort oldest) keeps the oldest design full');
        assert(byDecisions.manifest.sort === 'recency' && Object.fromEntries(byDecisions.docs.map(d => [d.id, d.tier]))['d3'] === 'full',
            'decisions (defaultSort recency) keeps the newest doc full');
        console.log('  ✅ sort: per-kind defaultSort applied (designs→oldest, decisions→recency)');
    }

    // 16. An explicit sort param overrides the kind default (both directions).
    {
        const designs = getReportKind('designs')!;   // default oldest
        const overridden = selectReportDocs(budgetState, designs, {}, midBudget, 'recency');
        assert(overridden.manifest.sort === 'recency' && Object.fromEntries(overridden.docs.map(d => [d.id, d.tier]))['d3'] === 'full',
            'explicit recency overrides designs default oldest → newest full');
        const decisionsOldest = selectReportDocs(budgetState, decisions, {}, midBudget, 'oldest'); // default recency
        assert(decisionsOldest.manifest.sort === 'oldest' && Object.fromEntries(decisionsOldest.docs.map(d => [d.id, d.tier]))['d1'] === 'full',
            'explicit oldest overrides decisions default recency → oldest full');
        console.log('  ✅ sort: explicit param overrides the kind default');
    }

    // 17. Budget suggestion (MCP prompt): leads with the --sort/--full levers. ctx is
    //     global-only now, so there is NO weave-ctx nudge (the old secondary option is gone).
    {
        const big = linesBody('Big', 400);
        const s6 = state([
            weave('wb', [thread('wb', 'tb', { design: docB('design', 'd-wb1', '2026-02-01', big) }),
                         thread('wb', 'tc', { design: docB('design', 'd-wb2', '2026-03-01', big) })]),
        ]);
        const degraded = selectReportDocs(s6, decisions, {}, 800); // both designs degrade
        assert(degraded.manifest.budgeted, 'fixture actually degrades docs');
        const text = renderSelection(degraded);
        assert(text.includes('TO KEEP MORE DOCS FULL') && text.includes('--sort') && text.includes('--full'),
            'suggestion LEADS with the --sort / --full levers');
        assert(!text.includes('Secondary option') && !/weave[ -]ctx/i.test(text),
            'no weave-ctx nudge — ctx is global-only');
        assert(text.includes('sort=recency'), 'coverage manifest line surfaces the effective sort');
        console.log('  ✅ prompt: budget suggestion leads with --sort/--full (no weave-ctx nudge)');
    }

    // --- Release-notes brief (buildReleaseNotesBrief) --------------------------------
    // 18. Selects the Unreleased (release==null) done plans, hydrates their done-doc bodies,
    //     captures implementing threads; --titles-only drops the bodies.
    {
        const mkThread = (slug: string, o: any): any => ({
            id: slug, weaveSlug: 'wr',
            manifest: { id: `th_${slug}`, priority: 100, created: '2026-07-01', depends_on: [] },
            idea: null, design: null, req: null,
            plans: [{ type: 'plan', id: o.planId, title: `${o.planId} title`, status: o.planStatus, created: '2026-07-01', updated: '2026-07-01', version: 1, actual_release: o.release ?? null, steps: [] }],
            dones: o.doneBody != null ? [{ type: 'done', id: `${o.planId}-done`, parent_id: o.planId, title: 'd', status: 'done', created: '2026-07-02', version: 1, content: o.doneBody }] : [],
            chats: [], refDocs: [], allDocs: [],
        });
        const rnState: any = {
            weaves: [{
                id: 'wr', threads: [
                    mkThread('ta', { planId: 'pl_a', planStatus: 'done', release: null, doneBody: 'Added the A capability — users can now do A.' }),
                    mkThread('tb', { planId: 'pl_b', planStatus: 'done', release: '1.0.0', doneBody: 'shipped B' }),
                    mkThread('tc', { planId: 'pl_c', planStatus: 'implementing' }),
                ], looseFibers: [], chats: [], refDocs: [], allDocs: [],
            }],
            globalDocs: [], globalChats: [],
        };

        const brief = buildReleaseNotesBrief(rnState);
        assert(brief.unreleased.length === 1 && brief.unreleased[0].planId === 'pl_a', `Unreleased = the release==null done plan only, got ${brief.unreleased.map((u: any) => u.planId).join(',')}`);
        assert(brief.unreleased[0].doneBody === 'Added the A capability — users can now do A.', 'enrichment hydrates the done-doc body');
        assert(brief.enriched === true && brief.isEmpty === false, 'default is enriched, non-empty');
        assert(brief.implementingThreads.some((t: any) => t.threadSlug === 'tc'), 'captures threads still implementing (empty-set diagnosis)');
        assert(!brief.unreleased.some((u: any) => u.planId === 'pl_b'), 'excludes the already-released plan (release=1.0.0)');

        const titlesOnly = buildReleaseNotesBrief(rnState, { titlesOnly: true });
        assert(titlesOnly.unreleased[0].doneBody === undefined && titlesOnly.enriched === false, '--titles-only drops done-doc bodies');

        // Empty set (only a released plan) → isEmpty true.
        const emptyState: any = { weaves: [{ id: 'wr', threads: [mkThread('tb', { planId: 'pl_b', planStatus: 'done', release: '1.0.0', doneBody: 'x' })], looseFibers: [], chats: [], refDocs: [], allDocs: [] }], globalDocs: [], globalChats: [] };
        assert(buildReleaseNotesBrief(emptyState).isEmpty === true, 'no release==null plans → isEmpty');
        console.log('  ✅ release-notes brief: Unreleased selection, done-body enrichment, titles-only, implementing threads, empty');
    }

    // 19. renderReleaseNotes — empty set emits a structured stop-signal that names implementing
    //     threads; a non-empty set renders the enriched slice with the hydrated done body.
    {
        const mk = (slug: string, o: any): any => ({
            id: slug, weaveSlug: 'wr',
            manifest: { id: `th_${slug}`, priority: 100, created: '2026-07-01', depends_on: [] },
            idea: null, design: null, req: null,
            plans: [{ type: 'plan', id: o.planId, title: `${o.planId} title`, status: o.planStatus, created: '2026-07-01', updated: '2026-07-01', version: 1, actual_release: o.release ?? null, steps: [] }],
            dones: o.doneBody != null ? [{ type: 'done', id: `${o.planId}-done`, parent_id: o.planId, title: 'd', status: 'done', created: '2026-07-02', version: 1, content: o.doneBody }] : [],
            chats: [], refDocs: [], allDocs: [],
        });
        const mkState = (threads: any[]): any => ({ weaves: [{ id: 'wr', threads, looseFibers: [], chats: [], refDocs: [], allDocs: [] }], globalDocs: [], globalChats: [] });

        // Empty set but a thread mid-flight → stop-signal names it.
        const emptyBrief = buildReleaseNotesBrief(mkState([mk('tc', { planId: 'pl_c', planStatus: 'implementing' })]));
        assert(emptyBrief.isEmpty, 'fixture has no unreleased done plans');
        const sig = renderReleaseNotes(emptyBrief);
        assert(/NOTHING UNRELEASED/.test(sig) && /stop/i.test(sig), 'empty render is a stop-signal');
        assert(/implementing/.test(sig) && /wr\/tc/.test(sig), 'empty stop-signal names the implementing thread');

        // Non-empty → the enriched slice carries the hydrated done body.
        const rendered = renderReleaseNotes(buildReleaseNotesBrief(mkState([mk('ta', { planId: 'pl_a', planStatus: 'done', release: null, doneBody: 'Added the A capability — users can now do A.' })])));
        assert(/Added the A capability/.test(rendered) && /pl_a/.test(rendered), 'non-empty render includes the hydrated done body');
        console.log('  ✅ renderReleaseNotes: empty stop-signal (+ implementing thread), non-empty enriched slice');
    }

    console.log('\n✅ selectReportDocs tests passed');
}

run().catch(e => { console.error('❌', e); process.exit(1); });
