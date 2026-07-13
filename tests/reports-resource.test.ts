import * as fs from 'fs-extra';
import * as path from 'path';
import * as os from 'os';
import { listReports } from '../packages/app/dist/listReports';
import { assert } from './test-utils';

// Exercises the report scanner that backs loom://reports (plan-007 step 1).
// Reports are kept out of LoomState (storage decision A), so this scanner is the
// only read path that surfaces them — verify it finds cross-weave + weave-scoped
// reports, tags each with the right weaveSlug, orders newest-first, and ignores
// non-report markdown.

const ROOT = path.join(os.tmpdir(), 'loom-reports-resource-test');

function reportDoc(id: string, title: string, kind: string, generatedAt: string): string {
    return [
        '---',
        'type: report',
        `id: ${id}`,
        `title: "${title}"`,
        'status: active',
        'created: 2026-07-12',
        'version: 1',
        'tags: []',
        'parent_id: null',
        'requires_load: []',
        `kind: ${kind}`,
        `generated_at: "${generatedAt}"`,
        '---',
        '',
        `# ${title}`,
        '',
        'body',
        '',
    ].join('\n');
}

async function run() {
    await fs.remove(ROOT);
    const loomDir = path.join(ROOT, 'loom');

    // Cross-weave reports (loom/reports/)
    await fs.outputFile(
        path.join(loomDir, 'reports', 'Overview (2026-07-12) - project-overview report.md'),
        reportDoc('rp_CROSS1', 'Project Overview', 'project-overview', '2026-07-12T10:00:00.000Z'),
    );
    await fs.outputFile(
        path.join(loomDir, 'reports', 'Decisions (2026-07-12) - decisions report.md'),
        reportDoc('rp_CROSS2', 'Decisions', 'decisions', '2026-07-12T12:00:00.000Z'),
    );
    // Weave-scoped report (loom/{weave}/reports/)
    await fs.outputFile(
        path.join(loomDir, 'core-engine', 'reports', 'Designs (2026-07-12) - designs report.md'),
        reportDoc('rp_WEAVE1', 'Core Engine Designs', 'designs', '2026-07-12T11:00:00.000Z'),
    );
    // Noise that must be ignored: a non-report md inside reports/, and a normal weave doc
    await fs.outputFile(
        path.join(loomDir, 'reports', 'notes.md'),
        '---\ntype: idea\nid: id_x\ntitle: "x"\nstatus: draft\ncreated: 2026-07-12\nversion: 1\n---\n# x\n',
    );
    await fs.outputFile(
        path.join(loomDir, 'core-engine', 'some-thread', 'idea.md'),
        '---\ntype: idea\nid: id_y\ntitle: "y"\nstatus: draft\ncreated: 2026-07-12\nversion: 1\n---\n# y\n',
    );

    const reports = await listReports({ getActiveLoomRoot: () => ROOT, fs });

    assert(reports.length === 3, `expected 3 reports, got ${reports.length}`);

    // Newest-first by generated_at: Decisions(12:00) > Weave(11:00) > Overview(10:00)
    assert(reports[0].id === 'rp_CROSS2', `expected rp_CROSS2 first, got ${reports[0].id}`);
    assert(reports[1].id === 'rp_WEAVE1', `expected rp_WEAVE1 second, got ${reports[1].id}`);
    assert(reports[2].id === 'rp_CROSS1', `expected rp_CROSS1 third, got ${reports[2].id}`);

    // weaveSlug: null for cross-weave, slug for weave-scoped
    const cross = reports.find(r => r.id === 'rp_CROSS1')!;
    const weaveScoped = reports.find(r => r.id === 'rp_WEAVE1')!;
    assert(cross.weaveSlug === null, `cross report weaveSlug should be null, got ${cross.weaveSlug}`);
    assert(weaveScoped.weaveSlug === 'core-engine', `weave report slug should be core-engine, got ${weaveScoped.weaveSlug}`);

    // Metadata carried through
    assert(cross.kind === 'project-overview', `kind mismatch: ${cross.kind}`);
    assert(cross.title === 'Project Overview', `title mismatch: ${cross.title}`);
    assert(cross.filePath.endsWith('.md'), 'filePath should be a .md path');

    // Non-report markdown ignored (even when it sits in reports/)
    assert(!reports.some(r => r.id === 'id_x'), 'non-report md in reports/ must be ignored');
    assert(!reports.some(r => r.id === 'id_y'), 'normal weave idea must be ignored');

    await fs.remove(ROOT);
    console.log('✅ reports-resource.test passed');
}

run().catch(e => { console.error('❌ reports-resource.test failed:', e); process.exit(1); });
