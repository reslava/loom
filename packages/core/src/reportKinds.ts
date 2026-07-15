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
/**
 * Keep-full ordering under the budget: which docs keep their full body when the slice
 * exceeds `maxChars`. `recency` keeps the NEWEST docs full (degrades the oldest tail);
 * `oldest` keeps the OLDEST/foundational docs full (degrades the newest tail). This only
 * changes the RELEVANCE order used for tier allocation — the OUTPUT stays chronological.
 */
export type ReportSort = 'recency' | 'oldest';

/**
 * How a report kind's source slice is assembled — the explicit selection-shape
 * discriminator the `report` prompt switches on. Retires the old brittle inference
 * (`docTypes.length === 0` ⇒ roadmap, `slug === 'release-notes'` ⇒ brief), which broke
 * down once a fourth shape (`forward-signal`) also carried empty `docTypes`.
 *
 * - `docset`        — deterministic doc-type scan via `selectReportDocs` (`docTypes`).
 * - `roadmap`       — roadmap passthrough (reads `loom://roadmap`); `docTypes` empty.
 * - `release-notes` — the enriched Unreleased brief (`buildReleaseNotesBrief`).
 * - `forward-signal`— the derived forward-signal slice (`buildForwardSignal`); prospective.
 */
export type ReportSource = 'docset' | 'roadmap' | 'release-notes' | 'forward-signal';

export interface ReportKind {
    slug: string;
    title: string;
    /**
     * How this kind's source slice is assembled. Drives the `report` prompt's selection
     * branch (replacing the old `docTypes.length === 0` inference). `docset` kinds scan
     * `docTypes`; the other sources ignore `docTypes` and read a derived slice.
     */
    source: ReportSource;
    /** Doc types this kind reads (only meaningful for `source: 'docset'`; empty otherwise). */
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
    /**
     * Optional per-kind default keep-full ordering under the budget. Single-doc-type kinds
     * (ideas/designs/plans/dones) and `architecture` default to `oldest` so foundational
     * docs stay full; analytical kinds (decisions/drift-audit/security) and roadmap-sourced
     * kinds default to `recency`. Falls back to `DEFAULT_REPORT_SORT`; a caller may override
     * per-run via `selectReportDocs`' `sort` param.
     */
    defaultSort?: ReportSort;
}

/**
 * Default deterministic char budget for a report's selected slice (~15k tokens at ~4
 * chars/token). A kind may override via `maxChars`; a caller may override per-run.
 * Roadmap-sourced kinds (empty `docTypes`) bypass selection, so the budget never applies
 * to them.
 */
export const DEFAULT_REPORT_MAX_CHARS = 60000;

/**
 * Default keep-full ordering when neither the caller nor the kind specifies one. `recency`
 * matches the original budget behavior (newest docs keep full bodies).
 */
export const DEFAULT_REPORT_SORT: ReportSort = 'recency';

export const REPORT_KINDS: Record<string, ReportKind> = {
    'project-overview': {
        slug: 'project-overview',
        title: 'Project Overview',
        source: 'roadmap',
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
        source: 'release-notes',
        docTypes: [],
        scopeHint: 'cross-weave',
        promptFraming: [
            'Produce the **Unreleased release-notes / changelog** section from the slice below — the shipped-but-not-yet-released plans (done plans with no release stamped yet), newest first, each with its done-doc detail when present.',
            '',
            '- **Lead with a one-line _Highlights_ summary** of the most user-visible changes.',
            '- Then sub-structure the entries as `### Added` / `### Changed` / `### Fixed` — classify each plan by its outcome (a new capability = Added, changed or improved existing behavior = Changed, a bug/regression fix = Fixed). Omit any bucket that would be empty.',
            '- Write each entry as a **user-facing outcome in a benefit voice** — what the user can now do, or no longer suffers — drawn from the done-doc detail, not the internal/engineering plan title. **Group related entries** so it reads as a coherent story, not a flat dump.',
            '- Output under an `## [Unreleased]` heading, ready to drop into a Keep-a-Changelog `CHANGELOG.md`.',
            '',
            'Write clean, scannable markdown. Do NOT invent entries or outcomes the slice does not support.',
        ].join('\n'),
    },
    architecture: {
        slug: 'architecture',
        title: 'Architecture',
        source: 'docset',
        // ctx included as an orientation input (a scope/global summary) — summary-friendly.
        docTypes: ['design', 'reference', 'ctx'],
        scopeHint: 'cross-weave',
        // Foundational (lowest-layer, oldest) designs matter most for architecture — keep them full.
        defaultSort: 'oldest',
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
        source: 'docset',
        docTypes: ['chat', 'design'],
        scopeHint: 'cross-weave',
        // Analytical: recent rationale is usually the most relevant — keep newest full.
        defaultSort: 'recency',
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
        source: 'docset',
        docTypes: ['design', 'done'],
        scopeHint: 'cross-weave',
        defaultSort: 'recency',
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
        source: 'docset',
        docTypes: ['design', 'done', 'reference'],
        scopeHint: 'cross-weave',
        defaultSort: 'recency',
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
        source: 'docset',
        docTypes: ['idea', 'ctx'],
        scopeHint: 'cross-weave',
        maxChars: 150000,
        // Single-doc-type complete report — foundational (oldest) docs stay full.
        defaultSort: 'oldest',
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
        source: 'docset',
        docTypes: ['design', 'ctx'],
        scopeHint: 'cross-weave',
        maxChars: 150000,
        defaultSort: 'oldest',
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
        source: 'docset',
        docTypes: ['plan', 'ctx'],
        scopeHint: 'cross-weave',
        maxChars: 150000,
        defaultSort: 'oldest',
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
        source: 'docset',
        docTypes: ['done', 'ctx'],
        scopeHint: 'cross-weave',
        maxChars: 150000,
        defaultSort: 'oldest',
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
    // --- Prospective kind: the doc graph's OPEN material, ranked into next work --------
    // Unlike every kind above (retrospective — what happened), this one is forward-looking:
    // its slice is the derived forward signal (buildForwardSignal), not a doc-type scan.
    // The `creativity` clause is appended by the report prompt at run time.
    'next-work': {
        slug: 'next-work',
        title: 'Next Work',
        source: 'forward-signal',
        docTypes: [],
        scopeHint: 'cross-weave',
        promptFraming: [
            'Produce a **next-work report** from the forward-signal slice below — the project\'s open material, already grouped as **parked decisions**, **stalled intent**, **blocked work**, and **drift debt**, each item carrying a deterministic leverage / readiness / age signal.',
            '',
            'Output a **single ranked next-work list** — highest-leverage and unblocked first (the slice is pre-sorted; keep that order unless a tighter grouping genuinely reads better). For each proposal give:',
            '',
            '- **What to do** — one concrete, actionable move.',
            '- **Why now** — the signal it derives from: cite the source doc id(s) AND which group fired.',
            '- **Leverage** — what resolving it unblocks (dependents / dependent steps / downstream docs).',
            '- **First move** — the concrete next action (e.g. "decide X recorded on id_…", "refine the stale plan", "unblock the named step").',
            '',
            'Ground every proposal in a cited signal item — do NOT propose work no item supports, and do NOT invent problems the slice does not show (you may propose a bolder *solution* to an item per the creativity setting, but never a new *problem*). If the slice reports no open material, say so and stop — do not manufacture a backlog.',
        ].join('\n'),
    },
};

export function getReportKind(slug: string): ReportKind | undefined {
    return REPORT_KINDS[slug];
}

export function reportKindSlugs(): string[] {
    return Object.keys(REPORT_KINDS);
}
