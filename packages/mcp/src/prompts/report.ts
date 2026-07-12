import { getReportKind, reportKindSlugs, selectReportDocs, ReportFilters, ReportSelection } from '../../../core/dist';
import { getState } from '../../../app/dist/getState';
import { getActiveLoomRoot, loadWeave, buildLinkIndex, ConfigRegistry } from '../../../fs/dist';
import * as fs from 'fs-extra';
import { handleRoadmapResource } from '../resources/roadmap';
import { initStateCache, getCachedState, setCachedState } from '../stateCache';

export const promptDef = {
    name: 'report',
    description:
        'Assemble a filtered slice of the Loom doc graph for a report kind and return an instruction to synthesize the report, then persist it via loom_create_report. Roadmap-sourced kinds (project-overview) read loom://roadmap; doc-set kinds select docs by kind.docTypes + filters via selectReportDocs.',
    arguments: [
        { name: 'kind', description: 'Report kind slug (e.g. "project-overview", "architecture").', required: true },
        { name: 'weaveSlug', description: 'Optional weave filter (also the persist target + provenance).', required: false },
        { name: 'threadSlug', description: 'Optional thread filter.', required: false },
        { name: 'from', description: 'Optional inclusive lower bound on doc created date (YYYY-MM-DD).', required: false },
        { name: 'to', description: 'Optional inclusive upper bound on doc created date (YYYY-MM-DD).', required: false },
    ],
};

/** Render a selectReportDocs result as an agent-readable markdown slice. */
function renderSelection(sel: ReportSelection): string {
    const m = sel.manifest;
    const coverage =
        `Coverage manifest: counts=${JSON.stringify(m.counts)} · tiers=${JSON.stringify(m.tiers)} · ` +
        `${m.emittedChars} of ${m.fullChars} chars emitted · budget=${m.maxChars} · budgeted=${m.budgeted}` +
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

    const messages: Array<{ role: 'user' | 'assistant'; content: { type: 'text'; text: string } }> = [];

    let sliceText = '';
    let sourcesHint = '["loom://roadmap"]';

    if (kind.docTypes.length === 0) {
        // Roadmap-sourced kind (e.g. project-overview): read the derived roadmap.
        try {
            const roadmap = await handleRoadmapResource(root, 'loom://roadmap');
            sliceText = `Source slice — the derived roadmap (loom://roadmap):\n\n\`\`\`json\n${roadmap.contents[0].text}\n\`\`\``;
        } catch { /* selection is best-effort */ }
    } else {
        // Doc-set kind: deterministic selection over the current state.
        initStateCache(root);
        let state = getCachedState();
        if (!state) {
            const registry = new ConfigRegistry();
            state = await getState({ getActiveLoomRoot, loadWeave, buildLinkIndex, registry, fs, workspaceRoot: root });
            setCachedState(state);
        }
        const selection = selectReportDocs(state, kind, filters);
        sliceText = renderSelection(selection);
        sourcesHint = '[the ids of the docs listed in the slice above]';
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

    const instruction = [
        `# Generate a ${kind.title} report`,
        '',
        kind.promptFraming,
        '',
        persist,
    ].join('\n');

    messages.push({ role: 'user', content: { type: 'text', text: instruction } });

    return { description: `Generate a ${kind.title} report`, messages };
}
