import * as path from 'path';
import * as fsExtra from 'fs-extra';
import { generateDocId, today as todayStamp, nowIso } from '../../core/dist';

/** Provenance filter that produced a report — recorded in the body, not frontmatter. */
export interface ReportScope {
    weaves?: string[];
    threads?: string[];
    from?: string | null;
    to?: string | null;
}

export interface CreateReportInput {
    kind: string;
    title: string;
    content: string;
    /** Omit for a cross-weave/roadmap report (top-level loom/reports/). */
    weaveSlug?: string;
    scope?: ReportScope;
    sources?: string[];
}

export interface CreateReportDeps {
    getActiveLoomRoot: () => string;
    fs: typeof fsExtra;
}

/** Map filesystem-illegal chars to a space; keep human spaces/parens; collapse + trim. */
function safeFileStem(s: string): string {
    return s.replace(/[\\/:*?"<>|]+/g, ' ').replace(/\s+/g, ' ').trim();
}

/**
 * Persist an already-synthesized report as a standalone `report` artifact doc.
 *
 * A report is a **leaf snapshot** — deliberately NOT loaded into LoomState (see the
 * loom-ai-analysis design, storage decision A): being outside project state makes it
 * excluded-by-construction from refs / staleness / derived-status / requires_load.
 * It is a versioned markdown file on disk (born status "active", version 1), written
 * under `loom/reports/` (cross-weave) or `loom/{weave}/reports/` (weave-scoped). The
 * agent authors `content`; this use-case only writes the file. Shared by the MCP tool
 * and the CLI so both surfaces write byte-identical files.
 *
 * Frontmatter is deliberately minimal (kind + generated_at); scope + sources are
 * rendered as a body `## Provenance` section (design fork 1a), not frontmatter — the
 * canonical serializer is flat and would JSON-stringify a nested scope object.
 */
export async function createReport(
    input: CreateReportInput,
    deps: CreateReportDeps
): Promise<{ id: string; filePath: string; kind: string }> {
    const loomRoot = deps.getActiveLoomRoot();
    const { kind, title, content } = input;
    const scope = input.scope ?? {};
    const sources = input.sources ?? [];

    const id = generateDocId('report');
    const date = todayStamp();
    const generatedAt = nowIso();

    // The filename appends `({date})`, so a title that already ends in a date would
    // double it (e.g. "Overview (2026-07-12) (2026-07-12) - …"). Strip a trailing
    // `(YYYY-MM-DD)` from the title before using it — the prompt asks for a date-less
    // title, this is the belt-and-suspenders for a title that carries one anyway. The
    // date already lives in `created` / `generated_at`, so the title never needs it.
    const cleanTitle = title.replace(/\s*\(\d{4}-\d{2}-\d{2}\)\s*$/, '').trim() || title;

    const reportsDir = input.weaveSlug
        ? path.join(loomRoot, 'loom', input.weaveSlug, 'reports')
        : path.join(loomRoot, 'loom', 'reports');
    await deps.fs.ensureDir(reportsDir);

    const fileStem = safeFileStem(`${cleanTitle} (${date}) - ${kind} report`);
    const filePath = path.join(reportsDir, `${fileStem}.md`);

    const frontmatter = [
        '---',
        'type: report',
        `id: ${id}`,
        `title: "${cleanTitle.replace(/"/g, '\\"')}"`,
        'status: active',
        `created: ${date}`,
        'version: 1',
        'tags: []',
        'parent_id: null',
        'requires_load: []',
        `kind: ${kind}`,
        `generated_at: "${generatedAt}"`,
        '---',
        '',
    ];

    const weaves = scope.weaves?.length ? scope.weaves.join(', ') : 'all';
    const threads = scope.threads?.length ? scope.threads.join(', ') : 'all';
    const provenance = [
        '## Provenance',
        '',
        `- **Kind:** ${kind}`,
        `- **Scope:** weaves: ${weaves}; threads: ${threads}; from: ${scope.from ?? '—'}; to: ${scope.to ?? '—'}`,
        `- **Sources:** ${sources.length ? sources.join(', ') : '(roadmap)'}`,
        `- **Generated:** ${generatedAt}`,
    ].join('\n');

    const body = `${content.trimEnd()}\n\n${provenance}\n`;
    await deps.fs.writeFile(filePath, frontmatter.join('\n') + body, 'utf8');

    return { id, filePath, kind };
}
