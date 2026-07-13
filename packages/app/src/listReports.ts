import * as path from 'path';
import * as fsExtra from 'fs-extra';
import { loadDoc } from '../../fs/dist';

/**
 * One report artifact's metadata, as surfaced to the extension tree.
 *
 * Reports are LEAF SNAPSHOTS deliberately kept out of LoomState (loom-ai-analysis
 * storage decision A), so they never appear in getState / the link index. This
 * scanner is the ONLY read path that surfaces them — the read twin of `createReport`
 * (the write path). The extension consumes it via the `loom://reports` MCP resource
 * and never fs-scans loom docs directly (vscode → mcp → app + fs stays intact).
 */
export interface ReportSummary {
    id: string;
    title: string;
    kind: string;
    /** null = cross-weave report (top-level loom/reports/); else the owning weave slug. */
    weaveSlug: string | null;
    generated_at: string | null;
    filePath: string;
}

export interface ListReportsDeps {
    getActiveLoomRoot: () => string;
    fs: typeof fsExtra;
}

/** Scan one `reports/` dir, appending each `type: report` doc to `out`. Missing dir = no-op. */
async function collectReports(
    deps: ListReportsDeps,
    dir: string,
    weaveSlug: string | null,
    out: ReportSummary[],
): Promise<void> {
    let files: string[];
    try {
        files = (await deps.fs.readdir(dir)).filter((f: string) => f.endsWith('.md'));
    } catch {
        return; // no reports/ dir here — fine
    }
    for (const file of files) {
        const filePath = path.join(dir, file);
        try {
            const doc = await loadDoc(filePath) as {
                type?: string; id?: string; title?: string;
                kind?: string; generated_at?: string; created?: string;
            };
            if (doc.type !== 'report') continue;
            out.push({
                id: doc.id ?? file.replace(/\.md$/, ''),
                title: doc.title ?? file.replace(/\.md$/, ''),
                kind: doc.kind ?? 'unknown',
                weaveSlug,
                generated_at: doc.generated_at ?? doc.created ?? null,
                filePath,
            });
        } catch {
            // skip malformed / unreadable report docs
        }
    }
}

/**
 * List every report artifact on disk: cross-weave reports under `loom/reports/` and
 * weave-scoped reports under `loom/{weave}/reports/`. Deterministic, newest-first by
 * `generated_at` (title as tiebreak). Pure read — never mutates.
 */
export async function listReports(deps: ListReportsDeps): Promise<ReportSummary[]> {
    const loomDir = path.join(deps.getActiveLoomRoot(), 'loom');
    const out: ReportSummary[] = [];

    // Cross-weave reports: loom/reports/
    await collectReports(deps, path.join(loomDir, 'reports'), null, out);

    // Weave-scoped reports: loom/{weave}/reports/
    let entries: Array<{ name: string; isDirectory: () => boolean }>;
    try {
        entries = await deps.fs.readdir(loomDir, { withFileTypes: true }) as unknown as typeof entries;
    } catch {
        entries = [];
    }
    for (const entry of entries) {
        if (!entry.isDirectory()) continue;
        if (entry.name === 'reports' || entry.name === '.archive') continue;
        await collectReports(deps, path.join(loomDir, entry.name, 'reports'), entry.name, out);
    }

    out.sort((a, b) =>
        (b.generated_at ?? '').localeCompare(a.generated_at ?? '') ||
        a.title.localeCompare(b.title));
    return out;
}
