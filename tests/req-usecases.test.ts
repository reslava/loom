import * as path from 'path';
import * as fs from 'fs-extra';
import * as os from 'os';
import { assert } from './test-utils.ts';
import { createReq, refineReq, finalizeReq, weavePlan } from '../packages/app/dist/index.js';
import { saveDoc, loadDoc, loadWeave } from '../packages/fs/dist/index.js';

const TMP = path.join(os.tmpdir(), 'loom-req-usecase-tests');

function deps(loomRoot: string): any {
    return { getActiveLoomRoot: () => loomRoot, saveDoc, loadDoc, fs };
}

async function run() {
    console.log('🔁 Running req use-case tests...\n');
    await fs.remove(TMP);
    const loomRoot = TMP;
    const weaveId = 'core-engine';
    const threadId = 'rdd';
    await fs.ensureDir(path.join(loomRoot, 'loom', weaveId, threadId));

    // ── create ──
    console.log('  • createReq writes a draft req.md at v1...');
    const created = await createReq(
        { weaveId, threadId, content: '### ✅ Included\n- `IN1` Thing.\n' },
        deps(loomRoot),
    );
    assert(created.filePath.endsWith(`${path.sep}req.md`), `path ends with req.md, got ${created.filePath}`);
    let req: any = await loadDoc(created.filePath);
    assert(req.type === 'req', 'type is req');
    assert(req.status === 'draft' && req.version === 1, 'born draft v1');
    assert(req.id.startsWith('rq_'), `id has rq_ prefix, got ${req.id}`);
    console.log('    ✅ draft v1 created');

    // ── duplicate create rejected ──
    console.log('  • duplicate createReq throws...');
    let threw = false;
    try { await createReq({ weaveId, threadId }, deps(loomRoot)); } catch { threw = true; }
    assert(threw, 'a second createReq for the same thread must throw');
    console.log('    ✅ duplicate rejected');

    // ── finalize → locked, version unchanged ──
    console.log('  • finalizeReq locks the draft (no version bump)...');
    await finalizeReq({ weaveId, threadId }, deps(loomRoot));
    req = await loadDoc(created.filePath);
    assert(req.status === 'locked', 'status locked after finalize');
    assert(req.version === 1, 'finalize does not bump version');
    console.log('    ✅ locked at v1');

    // ── refine → re-open draft + bump ──
    console.log('  • refineReq re-opens to draft and bumps version...');
    const refined = await refineReq(
        { weaveId, threadId, content: '### ✅ Included\n- `IN1` Thing.\n- `IN2` More.\n' },
        deps(loomRoot),
    );
    req = await loadDoc(created.filePath);
    assert(req.status === 'draft', 'refine re-opens to draft');
    assert(req.version === 2 && refined.version === 2, `refine bumps to v2, got ${req.version}`);
    assert(req.content.includes('IN2'), 'content updated');
    console.log('    ✅ re-opened draft v2 with new content');

    // ── finalize again → locked v2 (idempotent on re-call) ──
    console.log('  • finalize again locks v2 and is idempotent...');
    await finalizeReq({ weaveId, threadId }, deps(loomRoot));
    await finalizeReq({ weaveId, threadId }, deps(loomRoot)); // second call is a no-op
    req = await loadDoc(created.filePath);
    assert(req.status === 'locked' && req.version === 2, 'locked at v2');
    console.log('    ✅ locked v2, finalize idempotent');

    // ── weavePlan stamps req_version from the locked req (req-staleness baseline) ──
    console.log('  • weavePlan stamps req_version from the locked req...');
    {
        const planDeps: any = { loadWeave, saveDoc, loadDoc, fs, loomRoot };
        const { filePath } = await weavePlan({ weaveId, threadId, title: 'P', steps: ['do a thing'] }, planDeps);
        const plan: any = await loadDoc(filePath);
        assert(plan.req_version === 2, `plan should stamp req_version 2 from the locked req, got ${plan.req_version}`);
        console.log('    ✅ plan.req_version stamped from locked req');
    }

    await fs.remove(TMP);
    console.log('\n✅ req use-case tests passed\n');
}

run().catch(e => { console.error('❌', e); process.exit(1); });
