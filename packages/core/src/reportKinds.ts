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
}

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
};

export function getReportKind(slug: string): ReportKind | undefined {
    return REPORT_KINDS[slug];
}

export function reportKindSlugs(): string[] {
    return Object.keys(REPORT_KINDS);
}
