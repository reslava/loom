import * as path from 'path';
import * as fs from 'fs-extra';
import * as os from 'os';
import { assert } from './test-utils.ts';
import { saveDoc, loadDoc } from '../packages/fs/dist/index.js';
import { weaveDesign } from '../packages/app/dist/weaveDesign.js';
import { createReq } from '../packages/app/dist/req.js';
import { createThread } from '../packages/app/dist/thread.js';

// Real-fs test of the new write-time baselines (steps 2 & 3 of the staleness model):
// a design stamps idea_version from the live idea; a req parents to the DESIGN and
// stamps design_version from the live design. See loom/refs/staleness-reference.md.

const TMP = path.join(os.tmpdir(), 'loom-staleness-baselines-tests');

async function run() {
    console.log('🔧 Running staleness-baselines tests...\n');
    await fs.remove(TMP);
    const root = TMP;
    const deps: any = { getActiveLoomRoot: () => root, saveDoc, loadDoc, fs };
    // Explicitly mint the thread (no auto-scaffold); reference it by its th_ ULID.
    const { id: threadUlid } = await createThread({ weaveId: 'w', threadId: 't' }, deps);
    const threadDir = path.join(root, 'loom', 'w', 't');

    // Idea at version 2 — the design must baseline against THIS version.
    // Canonical flat filename (idea.md), not the retired {thread}-idea.md legacy name.
    await saveDoc({
        type: 'idea', id: 'id_test', title: 'I', status: 'active',
        created: '2026-06-01', updated: '2026-06-01', version: 2,
        tags: [], parent_id: null, requires_load: [], content: '# I\n\nidea',
    } as any, path.join(threadDir, 'idea.md'));

    // ── design stamps idea_version + parents to the idea ──
    console.log('  • design stamps idea_version from the live idea...');
    const { filePath: designPath } = await weaveDesign({ weaveId: 'w', threadId: threadUlid }, deps);
    const design: any = await loadDoc(designPath);
    assert(design.idea_version === 2, `design.idea_version === 2, got ${design.idea_version}`);
    assert(design.parent_id === 'id_test', `design parented to the idea, got ${design.parent_id}`);
    console.log('    ✅ idea_version 2, parent = idea');

    // ── req parents to the DESIGN and stamps design_version ──
    console.log('  • req depends on the design (parent + design_version)...');
    await createReq({ weaveSlug: 'w', threadUlid }, deps);
    const req: any = await loadDoc(path.join(threadDir, 'req.md'));
    assert(req.parent_id === design.id, `req parented to the design (${design.id}), got ${req.parent_id}`);
    assert(req.design_version === design.version, `req.design_version === ${design.version}, got ${req.design_version}`);
    console.log('    ✅ req parent = design, design_version stamped');

    await fs.remove(TMP);
    console.log('\n✅ staleness-baselines tests passed\n');
}

run().catch(e => { console.error('❌', e); process.exit(1); });
