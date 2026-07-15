import { getReportKind, reportKindSlugs, selectReportDocs, ReportFilters, ReportSelection, ReportSort, buildReleaseNotesBrief, ReleaseNotesBrief, buildForwardSignal, ForwardSignal } from '../../../core/dist';
import { getState } from '../../../app/dist/getState';
import { getActiveLoomRoot, loadWeave, buildLinkIndex, ConfigRegistry } from '../../../fs/dist';
import * as fs from 'fs-extra';
import { handleRoadmapResource } from '../resources/roadmap';
import { initStateCache, getCachedState, setCachedState } from '../stateCache';

export const promptDef = {
    name: 'report',
    description:
        'Assemble a filtered slice of the Loom doc graph for a report kind and return an instruction to synthesize the report, then persist it via loom_create_report. Selection is chosen by kind.source: roadmap kinds (project-overview) read loom://roadmap; release-notes builds the Unreleased brief; forward-signal (next-work) mines the graph\'s open material via buildForwardSignal; docset kinds select docs by kind.docTypes + filters via selectReportDocs.',
    arguments: [
        { name: 'kind', description: 'Report kind slug (e.g. "project-overview", "next-work").', required: true },
        { name: 'weaveSlug', description: 'Optional weave filter (also the persist target + provenance).', required: false },
        { name: 'threadSlug', description: 'Optional thread filter.', required: false },
        { name: 'from', description: 'Optional inclusive lower bound on doc created date (YYYY-MM-DD).', required: false },
        { name: 'to', description: 'Optional inclusive upper bound on doc created date (YYYY-MM-DD).', required: false },
        { name: 'full', description: 'Disable the token budget — send the full slice with no degradation (doc-set kinds only; can be large/costly).', required: false },
        { name: 'sort', description: 'Keep-full ordering when budget-degraded: "recency" (newest docs stay full) or "oldest" (foundational docs stay full). Defaults per kind. Ignored with full=true.', required: false },
        { name: 'titlesOnly', description: 'release-notes only: skip done-doc hydration for a fast, low-token draft (titles only, no per-change rationale).', required: false },
        { name: 'forward', description: 'Read a retrospective kind prospectively: reframe its slice to propose next work (selection unchanged). No-op for next-work, which is already forward.', required: false },
        { name: 'creativity', description: 'Solution latitude for prospective output: "closed" (default — within the current stack/architecture) or "creative" (may propose new approaches/stack for an observed problem; grounding still required).', required: false },
    ],
};

/**
 * Forward mode (`forward=true`): reframe ANY retrospective kind's slice prospectively.
 * Selection is unchanged — only the synthesis lens shifts to "what does this imply next?".
 * This is the cheap experiment that tells us which retrospective slices carry forward signal.
 */
const FORWARD_REFRAME = [
    '**Forward mode.** The slice above is a *retrospective* set, but read it *prospectively*:',
    'from what it records, infer what it implies for **next work** — the follow-on decisions,',
    'reconciliations, extensions, or unfinished directions it tees up. Output a ranked list of',
    'proposed next moves, each grounded in and citing the specific doc id(s) it derives from.',
    'Do not merely summarize the past, and do not invent problems the slice does not support.',
].join('\n');

/**
 * Creativity knob — solution latitude, grounded-observation / free-solution. The observation
 * is always anchored to a cited signal; only how far the *solution* may roam changes.
 */
const CREATIVITY_CLAUSE: Record<'closed' | 'creative', string> = {
    closed: [
        '**Creativity: closed.** Stay within the project\'s current stack, architecture, and',
        'conventions — propose only work and solutions that fit what already exists.',
    ].join('\n'),
    creative: [
        '**Creativity: creative.** You may propose bolder *solutions* — a different approach,',
        'stack, or architecture — but only for a problem the slice actually shows. The',
        'observation must stay grounded in a cited signal; only the solution may range beyond',
        'the status quo. Never invent a problem the slice does not support.',
    ].join('\n'),
};

/**
 * Apply the prospective framing modifiers to a kind's base synthesis lens. Pure (exported
 * for tests): forward mode reframes a retrospective kind prospectively (a no-op for the
 * already-forward `forward-signal` source); creativity appends the solution-latitude clause,
 * defaulting to `closed` whenever the run is prospective (forward-signal source or forward
 * mode). A plain retrospective report with neither flag is returned unchanged.
 */
export function applyProspectiveFraming(
    baseFraming: string,
    source: string,
    opts: { forward: boolean; creativity?: 'closed' | 'creative' },
): string {
    let framing = baseFraming;
    if (opts.forward && source !== 'forward-signal') {
        framing = [framing, '', FORWARD_REFRAME].join('\n');
    }
    const prospective = source === 'forward-signal' || opts.forward;
    const level = opts.creativity ?? (prospective ? 'closed' : undefined);
    if (level) {
        framing = [framing, '', CREATIVITY_CLAUSE[level]].join('\n');
    }
    return framing;
}

/** Render a forward-signal slice (the ranked open-material items) as an agent-readable slice. Exported for tests. */
export function renderForwardSignal(sig: ForwardSignal): string {
    if (sig.isEmpty) {
        // Empty-set guard (mirrors renderReleaseNotes): no open material → a structured
        // stop-signal, no "produce a report" framing, so no backlog is manufactured.
        return [
            'NO OPEN MATERIAL — the forward-signal scan found no parked decisions, stalled intent, blocked work, or drift debt in scope.',
            '',
            'Do NOT manufacture a backlog. Report that there is nothing open to propose, and stop. Likely the scope is fully resolved, or a --weave/--thread/date filter is too narrow.',
        ].join('\n');
    }
    const c = sig.counts;
    const lines: string[] = [
        `Source slice — forward signal: ${sig.totalItems} open item(s) ` +
        `(parked-decision: ${c['parked-decision']}, stalled-intent: ${c['stalled-intent']}, ` +
        `blocked-work: ${c['blocked-work']}, drift-debt: ${c['drift-debt']}), ` +
        `pre-ranked by leverage, then readiness, then age` +
        (Object.keys(sig.filters).length ? ` · filters=${JSON.stringify(sig.filters)}` : '') + '.',
        '',
    ];
    for (const it of sig.items) {
        const loc = `${it.weaveSlug}/${it.threadSlug}`;
        const refs = it.refs && it.refs.length ? ` · refs: ${it.refs.join(', ')}` : '';
        lines.push(
            '---',
            `### [${it.group}] ${it.title} · id: ${it.docId} · ${loc}`,
            `signal: ${it.detail}`,
            `leverage: ${it.leverage} · ready: ${it.ready ? 'yes' : 'blocked'} · age: ${it.ageDays}d${refs}`,
            '',
        );
    }
    return lines.join('\n');
}

/** Render a release-notes brief (the Unreleased set + hydrated done bodies) as an agent-readable slice. Exported for tests. */
export function renderReleaseNotes(brief: ReleaseNotesBrief): string {
    if (brief.isEmpty) {
        // Doc-graph empty-set guard: no Unreleased plans. Emit a structured stop-signal so any
        // consumer (do-release skill, CI) halts cleanly instead of drafting an empty changelog.
        const lines = [
            'NOTHING UNRELEASED — no done plans carry a null release, so there is nothing to draft.',
            '',
            'Do NOT invent a changelog. Report this and stop. Likely one of:',
            brief.implementingThreads.length
                ? `- Work is mid-flight, not closed — threads still \`implementing\`: ${brief.implementingThreads.map(t => `${t.weaveSlug}/${t.threadSlug}`).join(', ')}. Close the plan (or \`quick ship\` the change), then re-run.`
                : '- No threads are `implementing` — if you did ship work, it may not be recorded as a done plan yet (`quick ship` it), or the tree has uncommitted work.',
            '- Or nothing has shipped since the last release (do-release run by mistake).',
        ];
        return lines.join('\n');
    }
    const lines: string[] = [
        `Source slice — release-notes: ${brief.unreleased.length} Unreleased done plan(s) ` +
        `(roadmap history where actual_release is null), newest first. ` +
        `Enrichment: ${brief.enriched ? 'done-doc bodies included below' : 'titles only (no per-change detail)'}.`,
        '',
    ];
    for (const e of brief.unreleased) {
        lines.push('---', `### ${e.planTitle} · ${e.weaveSlug}/${e.threadSlug} · plan ${e.planId} · ${e.date}`, '');
        if (e.doneBody) lines.push(e.doneBody.trim(), '');
        else lines.push('_(no done-doc body — title only)_', '');
    }
    return lines.join('\n');
}

/** Render a selectReportDocs result as an agent-readable markdown slice. Exported for tests. */
export function renderSelection(sel: ReportSelection): string {
    const m = sel.manifest;
    const coverage =
        `Coverage manifest: counts=${JSON.stringify(m.counts)} · tiers=${JSON.stringify(m.tiers)} · ` +
        `${m.emittedChars} of ${m.fullChars} chars emitted · budget=${Number.isFinite(m.maxChars) ? m.maxChars : 'unlimited'} · budgeted=${m.budgeted} · sort=${m.sort}` +
        (Object.keys(m.filters).length ? ` · filters=${JSON.stringify(m.filters)}` : '');
    const lines: string[] = [
        `Source slice — ${m.totalDocs} doc(s) selected for kind "${m.kind}" (types: ${m.docTypes.join(', ') || '—'}).`,
        coverage,
    ];
    if (m.budgeted) {
        lines.push(
            '',
            `NOTE ON COVERAGE — this slice was budget-degraded (${m.elision}). Each doc header below ` +
            `is tagged with its tier: [full] = full body; [summary] = a deterministic excerpt or a ` +
            `scope ctx (NOT the full text); [reference] = a marker only, body elided for budget. When ` +
            `you write the report, state its coverage honestly: do NOT present summarized/referenced ` +
            `docs as if you read them in full, and note which areas are covered only at summary or ` +
            `reference depth.`,
        );
        // Primary fix — lead with the ordering / full-slice levers, which directly control
        // WHICH docs keep full bodies (the better fixes for a designs/architecture run that
        // dropped foundational docs). ctx is demoted to a secondary opt-in below.
        const kept = m.sort === 'recency' ? 'newest' : 'oldest/foundational';
        const dropped = m.sort === 'recency' ? 'oldest/foundational' : 'newest';
        const flip: ReportSort = m.sort === 'recency' ? 'oldest' : 'recency';
        const flipKeeps = flip === 'oldest' ? 'foundational (oldest)' : 'newest';
        lines.push(
            `TO KEEP MORE DOCS FULL — this run used sort="${m.sort}", so the ${kept} docs kept full ` +
            `bodies and the ${dropped} docs were degraded. Re-run with \`--sort ${flip}\` to keep the ` +
            `${flipKeeps} docs full instead, or \`--full\` to keep the ENTIRE slice full (higher token ` +
            `cost). These are the direct fixes when a designs/architecture report dropped foundational docs.`,
        );
    }
    lines.push('');
    for (const d of sel.docs) {
        const loc = `${d.weaveSlug ?? '—'}${d.threadSlug ? `/${d.threadSlug}` : ''}`;
        lines.push('---', `### [${d.type}] [${d.tier}] ${d.title} · id: ${d.id} · ${loc} · created ${d.created}`, '', d.body, '');
    }
    return lines.join('\n');
}

export async function handle(root: string, args: Record<string, string | undefined>) {
    const kindSlug = args['kind'];
    if (!kindSlug) throw new Error('kind is required');
    const kind = getReportKind(kindSlug);
    if (!kind) {
        throw new Error(`Unknown report kind "${kindSlug}". Known kinds: ${reportKindSlugs().join(', ')}.`);
    }

    const weaveSlug = args['weaveSlug'];
    const filters: ReportFilters = {
        weaves: weaveSlug ? [weaveSlug] : undefined,
        threads: args['threadSlug'] ? [args['threadSlug']] : undefined,
        from: args['from'] ?? undefined,
        to: args['to'] ?? undefined,
    };
    // --full: unlimited budget (no degradation). Doc-set kinds only; roadmap kinds ignore it.
    const maxChars = args['full'] === 'true' ? Infinity : undefined;
    // Keep-full ordering (recency|oldest). Undefined = let the kind default decide. Validate
    // defensively — the MCP prompt is a public surface, not only reached via the CLI edge.
    const sortArg = args['sort'];
    if (sortArg !== undefined && sortArg !== 'recency' && sortArg !== 'oldest') {
        throw new Error(`Invalid sort "${sortArg}". Use "recency" or "oldest".`);
    }
    const sort = sortArg as ReportSort | undefined;
    // release-notes only: skip done-doc hydration for a fast, low-token draft.
    const titlesOnly = args['titlesOnly'] === 'true';
    // Prospective framing modifiers (no selection change). Validate creativity defensively —
    // the MCP prompt is a public surface, not only reached via the CLI edge.
    const forward = args['forward'] === 'true';
    const creativityArg = args['creativity'];
    if (creativityArg !== undefined && creativityArg !== 'closed' && creativityArg !== 'creative') {
        throw new Error(`Invalid creativity "${creativityArg}". Use "closed" or "creative".`);
    }
    const creativity = creativityArg as 'closed' | 'creative' | undefined;

    const messages: Array<{ role: 'user' | 'assistant'; content: { type: 'text'; text: string } }> = [];

    // Load (and cache) the full state — shared by the release-notes and doc-set paths.
    const loadStateCached = async () => {
        initStateCache(root);
        let state = getCachedState();
        if (!state) {
            const registry = new ConfigRegistry();
            state = await getState({ getActiveLoomRoot, loadWeave, buildLinkIndex, registry, fs, workspaceRoot: root });
            setCachedState(state);
        }
        return state;
    };

    let sliceText = '';
    let sourcesHint = '["loom://roadmap"]';

    // Selection shape is chosen by the kind's explicit `source` discriminator (retires the
    // old `docTypes.length === 0` / slug inference, which a fourth shape made brittle).
    switch (kind.source) {
        case 'release-notes': {
            // Roadmap-sourced but ENRICHED: select the Unreleased (release==null) set and hydrate
            // each plan's done-doc body (unless --titles-only). Pure builder lives in core.
            const brief = buildReleaseNotesBrief(await loadStateCached(), { titlesOnly });
            if (brief.isEmpty) {
                // Doc-graph empty-set guard: no Unreleased work → return ONLY the stop-signal,
                // with no "produce a report" framing or persist instruction, so any consumer
                // (do-release skill, CI) halts cleanly instead of drafting an empty changelog.
                return {
                    description: 'Release notes — nothing unreleased',
                    messages: [{ role: 'user' as const, content: { type: 'text' as const, text: renderReleaseNotes(brief) } }],
                };
            }
            sliceText = renderReleaseNotes(brief);
            sourcesHint = '["loom://roadmap", "the done docs of the Unreleased plans"]';
            break;
        }
        case 'forward-signal': {
            // Prospective kind (next-work): mine the graph's OPEN material into a ranked slice.
            const sig = buildForwardSignal(await loadStateCached(), filters);
            if (sig.isEmpty) {
                // Empty-set guard: no open material → return ONLY the stop-signal, no persist
                // framing, so no backlog is manufactured (mirrors release-notes).
                return {
                    description: 'Next work — no open material',
                    messages: [{ role: 'user' as const, content: { type: 'text' as const, text: renderForwardSignal(sig) } }],
                };
            }
            sliceText = renderForwardSignal(sig);
            sourcesHint = '[the ids of the signal items listed in the slice above]';
            break;
        }
        case 'roadmap': {
            // Roadmap-sourced kind (e.g. project-overview): read the derived roadmap.
            try {
                const roadmap = await handleRoadmapResource(root, 'loom://roadmap');
                sliceText = `Source slice — the derived roadmap (loom://roadmap):\n\n\`\`\`json\n${roadmap.contents[0].text}\n\`\`\``;
            } catch { /* selection is best-effort */ }
            break;
        }
        case 'docset':
        default: {
            // Doc-set kind: deterministic selection over the current state.
            const selection = selectReportDocs(await loadStateCached(), kind, filters, maxChars, sort);
            sliceText = renderSelection(selection);
            sourcesHint = '[the ids of the docs listed in the slice above]';
            break;
        }
    }

    if (sliceText) {
        messages.push({ role: 'user', content: { type: 'text', text: sliceText } });
    }

    const persist = [
        'When the report is written, persist it by calling loom_create_report with:',
        `- kind="${kind.slug}"`,
        '- title="<a concise report title WITHOUT a date — the date is appended to the filename automatically>"',
        '- content="<the full report markdown you wrote>"',
        weaveSlug ? `- weave_slug="${weaveSlug}"` : '- (omit weave_slug — this is a cross-weave report)',
        `- sources=${sourcesHint}`,
    ].join('\n');

    // Prompt-framing modifiers (no selection change) — see applyProspectiveFraming.
    const framing = applyProspectiveFraming(kind.promptFraming, kind.source, { forward, creativity });

    const instruction = [
        `# Generate a ${kind.title} report`,
        '',
        framing,
        '',
        persist,
    ].join('\n');

    messages.push({ role: 'user', content: { type: 'text', text: instruction } });

    return { description: `Generate a ${kind.title} report`, messages };
}
