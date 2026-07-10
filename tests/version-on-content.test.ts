import * as path from 'path';
import * as fs from 'fs-extra';
import * as os from 'os';
import { assert } from './test-utils.ts';
import { saveDoc, loadDoc, findDocumentById } from '../packages/fs/dist/index.js';
import { handle as updateDoc } from '../packages/mcp/dist/tools/updateDoc.js';
import { setStatus } from '../packages/app/dist/setStatus.js';

// loom_update_doc must bump version + updated ONLY on a content edit; a requires_load-only
// update is lifecycle, not a spec change, and must not bump. Status now lives in
// loom_set_status (update_doc rejects it), and a status change must also not bump version —
// else marking a parent done cascades false staleness. See staleness-reference.

const TMP = path.join(os.tmpdir(), 'loom-version-on-content-tests');

async function run() {
    console.log('🔧 Running version-on-content tests...\n');
    await fs.remove(TMP);
    const root = TMP;
    const designPath = path.join(root, 'loom', 'w', 't', 't-design.md');
    await fs.ensureDir(path.dirname(designPath));
    await saveDoc({
        type: 'design', id: 'ds_voc', title: 'D', status: 'active',
        created: '2026-06-01', updated: '2026-06-01', version: 1,
        tags: [], parent_id: null, requires_load: [], content: 'original body',
    } as any, designPath);

    // ── status moved to loom_set_status: update_doc rejects a status-only call ──
    console.log('  • update_doc no longer accepts status (rejects a status-only call)...');
    let rejected = false;
    try {
        await updateDoc(root, { id: 'ds_voc', status: 'done' } as any);
    } catch { rejected = true; }
    assert(rejected, 'update_doc must reject a status-only update (status moved to loom_set_status)');
    console.log('    ✅ update_doc rejects status-only');

    // ── set_status flips status WITHOUT bumping version/updated (no false staleness) ──
    console.log('  • set_status flips status but does NOT bump version or updated...');
    await setStatus({ docUlid: 'ds_voc', status: 'done' }, {
        loadDoc, saveDoc, getActiveLoomRoot: () => root, findDocumentById,
    } as any);
    {
        const d: any = await loadDoc(designPath);
        assert(d.status === 'done', `status applied, got ${d.status}`);
        assert(d.version === 1, `version unchanged on status change, got ${d.version}`);
        assert(d.updated === '2026-06-01', `updated unchanged on status change, got ${d.updated}`);
        console.log('    ✅ set_status → status done, version=1, updated untouched');
    }

    // ── content update: bumps version (and updated) ──
    console.log('  • content update bumps version...');
    await updateDoc(root, { id: 'ds_voc', content: 'revised body' });
    {
        const d: any = await loadDoc(designPath);
        assert(d.version === 2, `version bumped on content edit, got ${d.version}`);
        assert(d.content.includes('revised body'), 'content updated');
        console.log('    ✅ content edit → version 2');
    }

    // ── requires_load-only update: lifecycle, not a spec change → no bump ──
    console.log('  • requires_load-only update does NOT bump version...');
    await updateDoc(root, { id: 'ds_voc', requires_load: ['some-ref'] });
    {
        const d: any = await loadDoc(designPath);
        assert(JSON.stringify(d.requires_load) === JSON.stringify(['some-ref']), 'requires_load applied');
        assert(d.version === 2, `version unchanged on requires_load-only, got ${d.version}`);
        console.log('    ✅ requires_load-only left version=2');
    }

    await fs.remove(TMP);
    console.log('\n✅ version-on-content tests passed\n');
}

run().catch(e => { console.error('❌', e); process.exit(1); });
