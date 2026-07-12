import * as fs from 'fs-extra';
import * as path from 'path';
import * as os from 'os';
import { assert } from './test-utils.ts';
import { createReport } from '../packages/app/dist/createReport';
import { getState } from '../packages/app/dist/getState';
import { buildLinkIndex, loadWeave, ConfigRegistry } from '../packages/fs/dist';
import { parseDocId } from '../packages/core/dist';

// Report artifacts (storage decision A): standalone snapshot docs written under
// loom/reports/ (cross-weave) or loom/{weave}/reports/ (weave-scoped), deliberately
// kept OUT of LoomState and the link index — so excluded-by-construction from
// refs / staleness / derived-status / requires_load / diagnostics.

async function run() {
    console.log('📄 Running report-artifact tests...\n');

    const loomRoot = path.join(os.tmpdir(), 'loom-reports-test');
    await fs.remove(loomRoot);
    await fs.ensureDir(path.join(loomRoot, 'loom'));

    // 1. createReport writes a standalone artifact under loom/reports/ with rp_ id.
    const res = await createReport(
        {
            kind: 'project-overview',
            title: 'My Project',
            content: '# Overview\n\nSome body.',
            scope: { weaves: [], threads: [] },
            sources: ['loom://roadmap'],
        },
        { getActiveLoomRoot: () => loomRoot, fs },
    );
    assert(res.id.startsWith('rp_'), 'report id has rp_ prefix');
    assert(parseDocId(res.id)?.type === 'report', 'rp_ prefix resolves to report type');
    assert(res.filePath.includes(path.join('loom', 'reports')), 'cross-weave report written under loom/reports/');
    assert(await fs.pathExists(res.filePath), 'report file exists');
    const raw = await fs.readFile(res.filePath, 'utf8');
    assert(raw.includes('type: report'), 'frontmatter type: report');
    assert(raw.includes('status: active'), 'born status active');
    assert(raw.includes('kind: project-overview'), 'kind in frontmatter');
    assert(raw.includes('## Provenance'), 'body carries a Provenance section (scope + sources)');
    console.log('  ✅ createReport writes a standalone loom/reports/ artifact (rp_ id, active, minimal frontmatter)');

    // 2. Weave-scoped report lands under loom/{weave}/reports/.
    const res2 = await createReport(
        { kind: 'project-overview', title: 'Weave Report', content: 'body', weaveSlug: 'myweave' },
        { getActiveLoomRoot: () => loomRoot, fs },
    );
    assert(res2.filePath.includes(path.join('myweave', 'reports')), 'weave-scoped report under loom/{weave}/reports/');
    console.log('  ✅ weave-scoped report placement');

    // 3. Reports are invisible to LoomState — no phantom "reports" weave, no phantom
    //    "reports" thread inside myweave.
    const registry = new ConfigRegistry();
    const state = await getState({
        getActiveLoomRoot: () => loomRoot,
        loadWeave,
        buildLinkIndex,
        registry,
        fs,
        workspaceRoot: loomRoot,
    });
    assert(!state.weaves.some((w: any) => w.id === 'reports'), 'top-level loom/reports/ is NOT a phantom weave');
    const myweave = state.weaves.find((w: any) => w.id === 'myweave');
    if (myweave) {
        assert(!myweave.threads.some((t: any) => t.id === 'reports'), 'loom/myweave/reports/ is NOT a phantom thread');
    }
    console.log('  ✅ reports invisible to LoomState (no phantom weave / thread)');

    // 4. Reports are absent from the link index (not graph nodes → no refs/diagnostics leak).
    const index = await buildLinkIndex(loomRoot);
    assert(!index.byId.has(res.id), 'cross-weave report id absent from link index');
    assert(!index.byId.has(res2.id), 'weave-scoped report id absent from link index');
    console.log('  ✅ reports absent from link index (excluded from graph / diagnostics / requires_load)');

    // 5. A title that already carries a trailing date must NOT double it in the
    //    filename (the pattern appends `({date})`), and the stored title is de-dated —
    //    the date already lives in created / generated_at.
    const res3 = await createReport(
        { kind: 'project-overview', title: 'Dated Overview (2026-07-12)', content: 'body' },
        { getActiveLoomRoot: () => loomRoot, fs },
    );
    const dateCount = (path.basename(res3.filePath).match(/\d{4}-\d{2}-\d{2}/g) || []).length;
    assert(dateCount === 1, `filename carries exactly one date, got ${dateCount}: ${path.basename(res3.filePath)}`);
    const raw3 = await fs.readFile(res3.filePath, 'utf8');
    assert(/^title: "Dated Overview"$/m.test(raw3), 'stored title is de-dated (trailing date stripped)');
    console.log('  ✅ dated title de-duped in filename + frontmatter');

    await fs.remove(loomRoot);
    console.log('\n✅ report-artifact tests passed');
}

run().catch(e => { console.error('❌', e); process.exit(1); });
