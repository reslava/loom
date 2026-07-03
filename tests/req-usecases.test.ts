import * as path from 'path';
import * as fs from 'fs-extra';
import * as os from 'os';
import { assert } from './test-utils.ts';
import { createReq, amendReq, finalizeReq, weavePlan } from '../packages/app/dist/index.js';
import { createThread } from '../packages/app/dist/thread.js';
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
    // Explicitly mint the thread (no auto-scaffold); reference it by its th_ ULID.
    const { id: threadId } = await createThread({ weaveId, threadId: 'rdd' }, { getActiveLoomRoot: () => loomRoot, saveDoc, fs });

    // ── create ──
    console.log('  • createReq writes a draft req.md at v1...');
    const created = await createReq(
        { weaveSlug: weaveId, threadUlid: threadId, content: '### ✅ Included\n- `IN1` Thing.\n' },
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
    try { await createReq({ weaveSlug: weaveId, threadUlid: threadId }, deps(loomRoot)); } catch { threw = true; }
    assert(threw, 'a second createReq for the same thread must throw');
    console.log('    ✅ duplicate rejected');

    // ── finalize → locked, version unchanged ──
    console.log('  • finalizeReq locks the draft (no version bump)...');
    await finalizeReq({ weaveSlug: weaveId, threadUlid: threadId }, deps(loomRoot));
    req = await loadDoc(created.filePath);
    assert(req.status === 'locked', 'status locked after finalize');
    assert(req.version === 1, 'finalize does not bump version');
    console.log('    ✅ locked at v1');

    // ── amend (append) → re-open draft + bump ──
    console.log('  • amendReq appends a handle, re-opens to draft, bumps version...');
    const amended = await amendReq(
        { weaveSlug: weaveId, threadUlid: threadId, content: '### ✅ Included\n- `IN1` Thing.\n- `IN2` More.\n' },
        deps(loomRoot),
    );
    req = await loadDoc(created.filePath);
    assert(req.status === 'draft', 'amend re-opens to draft');
    assert(req.version === 2 && amended.version === 2, `amend bumps to v2, got ${req.version}`);
    assert(req.content.includes('IN2'), 'content updated (IN2 appended)');
    console.log('    ✅ re-opened draft v2 with appended IN2');

    // ── amend guard: deleting or renumbering an existing handle is refused ──
    console.log('  • amendReq refuses to delete or renumber a handle...');
    {
        let delThrew = false;
        try {
            // drop IN1 entirely → must throw, state unchanged
            await amendReq({ weaveSlug: weaveId, threadUlid: threadId, content: '### ✅ Included\n- `IN2` More.\n' }, deps(loomRoot));
        } catch (e) {
            delThrew = e instanceof Error && e.message.includes('IN1');
        }
        assert(delThrew, 'deleting IN1 must throw an error naming IN1');

        let renumThrew = false;
        try {
            // renumber IN1 → IN9 (same text) → must throw
            await amendReq({ weaveSlug: weaveId, threadUlid: threadId, content: '### ✅ Included\n- `IN9` Thing.\n- `IN2` More.\n' }, deps(loomRoot));
        } catch (e) {
            renumThrew = e instanceof Error && e.message.includes('IN1');
        }
        assert(renumThrew, 'renumbering IN1→IN9 must throw');

        req = await loadDoc(created.filePath);
        assert(req.version === 2 && req.content.includes('IN1') && req.content.includes('IN2'), 'refused amends leave state unchanged at v2');
        console.log('    ✅ delete + renumber refused; state intact');
    }

    // ── finalize again → locked v2 (idempotent on re-call) ──
    console.log('  • finalize again locks v2 and is idempotent...');
    await finalizeReq({ weaveSlug: weaveId, threadUlid: threadId }, deps(loomRoot));
    await finalizeReq({ weaveSlug: weaveId, threadUlid: threadId }, deps(loomRoot)); // second call is a no-op
    req = await loadDoc(created.filePath);
    assert(req.status === 'locked' && req.version === 2, 'locked at v2');
    console.log('    ✅ locked v2, finalize idempotent');

    // ── weavePlan stamps req_version from the locked req (req-staleness baseline) ──
    console.log('  • weavePlan stamps req_version from the locked req...');
    {
        const planDeps: any = { loadWeave, saveDoc, loadDoc, fs, loomRoot };
        const { filePath } = await weavePlan({ weaveId, threadId, title: 'P', steps: [{ description: 'do a thing' }] }, planDeps);
        const plan: any = await loadDoc(filePath);
        assert(plan.req_version === 2, `plan should stamp req_version 2 from the locked req, got ${plan.req_version}`);
        console.log('    ✅ plan.req_version stamped from locked req');
    }

    // ── amend can retire a handle via ~dropped (handle survives → allowed) ──
    console.log('  • amendReq accepts retiring a handle with ~dropped...');
    {
        const dropped = await amendReq(
            { weaveSlug: weaveId, threadUlid: threadId, content: '### ✅ Included\n- `IN1` Thing.\n- `IN2` ~dropped Retired.\n' },
            deps(loomRoot),
        );
        req = await loadDoc(created.filePath);
        assert(req.content.includes('~dropped'), 'dropped marker persisted');
        assert(dropped.version === 3, `bumped to v3, got ${dropped.version}`);
        console.log('    ✅ ~dropped accepted; both handles still present');
    }

    await fs.remove(TMP);
    console.log('\n✅ req use-case tests passed\n');
}

run().catch(e => { console.error('❌', e); process.exit(1); });
