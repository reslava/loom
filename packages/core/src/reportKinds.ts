/**
 * Report kinds — the pure data registry that drives the report feature. A *kind*
 * declares which doc-set feeds it (`docTypes`), its default scope, and the synthesis
 * `promptFraming` (the analytical lens). Adding a report kind = adding a registry
 * entry here, never a new selection code path.
 *
 * Pure core data (no IO): consumed by the MCP `report` prompt (framing) and, in later
 * slices, by the deterministic doc-selection in app/fs (`docTypes`). See the design in
 * loom/ai-integration/loom-ai-analysis. Slice 1 ships only `project-overview`
 * (selection = roadmap passthrough, so `docTypes` is empty).
 */
export interface ReportKind {
    slug: string;
    title: string;
    /** Doc types this kind reads. Empty = roadmap passthrough (no doc-type scan yet). */
    docTypes: string[];
    scopeHint: 'cross-weave' | 'weave' | 'thread';
    /** The synthesis instruction lens handed to the agent by the `report` prompt. */
    promptFraming: string;
    /**
     * Optional per-kind deterministic char budget for the selected slice. Falls back to
     * `DEFAULT_REPORT_MAX_CHARS`, and a caller may override per-run. When the full slice
     * exceeds it, `selectReportDocs` degrades lower-relevance docs to summaries /
     * reference-only — no AI, so it stays pure and free.
     */
    maxChars?: number;
}

/**
 * Default deterministic char budget for a report's selected slice (~15k tokens at ~4
 * chars/token). A kind may override via `maxChars`; a caller may override per-run.
 * Roadmap-sourced kinds (empty `docTypes`) bypass selection, so the budget never applies
 * to them.
 */
export const DEFAULT_REPORT_MAX_CHARS = 60000;

export const REPORT_KINDS: Record<string, ReportKind> = {
    'project-overview': {
        slug: 'project-overview',
        title: 'Project Overview',
        docTypes: [],
        scopeHint: 'cross-weave',
        promptFraming: [
            'Produce a **project overview** report from the roadmap slice below. Cover:',
            '',
            '- **What this project is** and the problem it solves (its goal).',
            '- **High-level areas of work** — infer the major areas from the weave and thread names.',
            '- **What has shipped** (history) and the current release.',
            '- **What is in progress and planned next** (present + future, in dependency + priority order).',
            '- **Risks, gaps, or inconsistencies** visible from the roadmap (cycles, dangling deps, stalled threads).',
            '',
            'Write clean, visually-scannable markdown: clear headings, short bullets, a lead summary. Do NOT invent facts the roadmap does not support.',
        ].join('\n'),
    },
    'release-notes': {
        slug: 'release-notes',
        title: 'Release Notes',
        docTypes: [],
        scopeHint: 'cross-weave',
        promptFraming: [
            'Produce **release notes / a changelog** from the roadmap slice below, using its `history` (shipped plans, each with a date and release version) and `currentRelease`.',
            '',
            '- **Group by release version**, newest first; unreleased shipped work under an "Unreleased" heading.',
            '- Within each release, list the shipped plans as concise, user-facing changelog bullets (turn plan titles into outcomes).',
            '- Note the current release at the top.',
            '',
            'Write clean, scannable markdown. Do NOT invent releases or entries the roadmap history does not contain.',
        ].join('\n'),
    },
    architecture: {
        slug: 'architecture',
        title: 'Architecture',
        // ctx included as an orientation input (a scope/global summary) — summary-friendly.
        docTypes: ['design', 'reference', 'ctx'],
        scopeHint: 'cross-weave',
        promptFraming: [
            'Produce an **architecture report** from the design and reference docs in the slice below. Cover:',
            '',
            '- **Layers / components** and how they fit together.',
            '- **Key technical decisions** and the trade-offs behind them (drawn from the design docs).',
            '- **Cross-cutting conventions** and constraints (from reference docs).',
            '- **Tensions or inconsistencies** between designs, if any surface.',
            '',
            'Cite the source doc id when a claim rests on a specific doc. Do NOT invent architecture the docs do not describe.',
        ].join('\n'),
    },
    decisions: {
        slug: 'decisions',
        title: 'Decisions',
        docTypes: ['chat', 'design'],
        scopeHint: 'cross-weave',
        promptFraming: [
            'Produce a **decisions ("why") report** from the chat and design docs in the slice below — the rationale that does NOT live in code. For each significant decision:',
            '',
            '- **What was decided**, and the **alternatives weighed**.',
            '- **Why** — the reasoning, constraints, and trade-offs (this is the point of the report).',
            '- Cite the source doc id (the chat/design where it was decided).',
            '',
            'Group related decisions. Do NOT invent rationale the docs do not state — if a decision’s "why" is not recorded, say so.',
        ].join('\n'),
    },
    'drift-audit': {
        slug: 'drift-audit',
        title: 'Design-vs-Done Drift Audit',
        docTypes: ['design', 'done'],
        scopeHint: 'cross-weave',
        promptFraming: [
            'Produce a **design-vs-done drift audit** from the slice below: compare what the **design** docs specified against what the **done** docs record was actually implemented. For each thread with both:',
            '',
            '- **Where implementation matched** the design (briefly).',
            '- **Where it drifted** — done work that diverged from, exceeded, or fell short of the design.',
            '- **Undocumented decisions** — done notes that changed direction without a design update.',
            '',
            'Cite doc ids. Flag threads that have a design but no done (unimplemented) and done but thin/absent design (under-specified). Do NOT invent drift the docs do not support.',
        ].join('\n'),
    },
    security: {
        slug: 'security',
        title: 'Security & Weakness',
        docTypes: ['design', 'done', 'reference'],
        scopeHint: 'cross-weave',
        promptFraming: [
            'Produce a **security & weakness report** from the design, done, and reference docs in the slice below. Look for:',
            '',
            '- **Risky decisions** — auth, secrets, permissions, external calls, data handling described in the docs.',
            '- **Weak points or gaps** — missing validation, error handling, or hardening the docs acknowledge or imply.',
            '- **Open concerns** the docs themselves flag as deferred or unresolved.',
            '',
            'Cite doc ids. Be concrete and grounded — do NOT invent vulnerabilities the docs do not describe; this is a review of documented decisions, not a code audit.',
        ].join('\n'),
    },
    // --- Single-doc-type "complete" kinds -------------------------------------------
    // Each reads exactly one doc type across the whole project — a per-lens complete
    // report. One doc type is a smaller, bounded slice than the multi-type analytical
    // kinds, so each carries a higher default budget; narrow with --weave/--thread.
    ideas: {
        slug: 'ideas',
        title: 'Ideas',
        docTypes: ['idea', 'ctx'],
        scopeHint: 'cross-weave',
        maxChars: 150000,
        promptFraming: [
            'Produce an **ideas report** — everything the project set out to build — from the idea docs in the slice below. Cover:',
            '',
            '- **What each idea proposes** and why it matters (its goal / success criteria).',
            '- **Themes across ideas** — recurring intents, grouped by area (infer areas from weave/thread names).',
            '- **Abandoned or superseded intentions**, if the docs show any.',
            '',
            'Group related ideas; cite the source idea id. Do NOT invent goals the ideas do not state.',
        ].join('\n'),
    },
    designs: {
        slug: 'designs',
        title: 'Designs',
        docTypes: ['design', 'ctx'],
        scopeHint: 'cross-weave',
        maxChars: 150000,
        promptFraming: [
            'Produce a **designs report** — the project\'s full design corpus — from the design docs in the slice below. Cover:',
            '',
            '- **The approach each design takes** and the key decisions / trade-offs behind it.',
            '- **How the designs fit together** — shared patterns, layering, cross-cutting conventions.',
            '- **Tensions or inconsistencies** between designs, if any surface.',
            '',
            'Group by area; cite the source design id. Do NOT invent architecture the docs do not describe.',
        ].join('\n'),
    },
    plans: {
        slug: 'plans',
        title: 'Plans',
        docTypes: ['plan', 'ctx'],
        scopeHint: 'cross-weave',
        maxChars: 150000,
        promptFraming: [
            'Produce a **plans report** — all planned work — from the plan docs in the slice below. Cover:',
            '',
            '- **What each plan builds** and the intent of its steps.',
            '- **Sequencing / dependencies** between plans where the docs show them.',
            '- **Areas of concentration** — where the planned effort clusters (grouped by weave/thread).',
            '',
            'Group by area; cite the source plan id. Do NOT invent work the plans do not describe.',
        ].join('\n'),
    },
    dones: {
        slug: 'dones',
        title: 'Shipped',
        docTypes: ['done', 'ctx'],
        scopeHint: 'cross-weave',
        maxChars: 150000,
        promptFraming: [
            'Produce a **shipped report** — everything actually implemented — from the done docs in the slice below. Cover:',
            '',
            '- **What was built** per plan (turn the done notes into concise outcomes).',
            '- **Notable decisions recorded during implementation** and any deviations from the plan the notes mention.',
            '- **Areas delivered** — grouped by weave/thread (and by release where the docs show it).',
            '',
            'Group by area; cite the source done id. Do NOT invent work the done docs do not record.',
        ].join('\n'),
    },
};

export function getReportKind(slug: string): ReportKind | undefined {
    return REPORT_KINDS[slug];
}

export function reportKindSlugs(): string[] {
    return Object.keys(REPORT_KINDS);
}
