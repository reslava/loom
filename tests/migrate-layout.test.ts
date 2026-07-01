import * as path from 'path';
import * as fs from 'fs-extra';
import * as os from 'os';
import { assert } from './test-utils.ts';
import { loadDoc } from '../packages/fs/dist/index.js';
import { migrateLayout } from '../packages/app/dist/migrateLayout.js';

const TMP = path.join(os.tmpdir(), 'loom-migrate-layout-tests');

async function writeDoc(file: string, fm: Record<string, unknown>, body: string) {
    const full: Record<string, unknown> = {
        created: '2026-07-01', status: 'active', tags: [], parent_id: null, requires_load: [],
        ...fm,
    };
    const lines = ['---'];
    for (const [k, v] of Object.entries(full)) {
        lines.push(`${k}: ${typeof v === 'string' ? v : JSON.stringify(v)}`);
    }
    lines.push('---', '', body, '');
    await fs.outputFile(file, lines.join('\n'));
}

async function seedLegacyRepo(): Promise<string> {
    const root = TMP;
    await fs.remove(root);
    const t = path.join(root, 'loom', 'wv', 'my-thread');
    // Legacy-named singletons + ordinal docs + the messy done variants.
    await writeDoc(path.join(t, 'my-thread-idea.md'), { type: 'idea', id: 'id_A', title: 'Idea', version: 1 }, '# Idea');
    await writeDoc(path.join(t, 'my-thread-design.md'), { type: 'design', id: 'de_A', title: 'Design', version: 1 }, '# Design');
    await writeDoc(path.join(t, 'req.md'), { type: 'req', id: 'rq_A', title: 'Req', version: 1 }, '# Req');           // already flat
    await writeDoc(path.join(t, 'plans', 'my-thread-plan-001.md'), { type: 'plan', id: 'pl_ULID1', title: 'P1', version: 1 }, '# P1');
    await writeDoc(path.join(t, 'plans', 'my-thread-plan-002.md'), { type: 'plan', id: 'pl_ULID2', title: 'P2', version: 1 }, '# P2');
    // Done docs: one legacy ULID-named (resolved via parent_id), one legacy plan-named.
    await writeDoc(path.join(t, 'done', 'pl_ULID1-done.md'), { type: 'done', id: 'pl_ULID1-done', title: 'D1', version: 1, parent_id: 'pl_ULID1' }, '## Step 1');
    await writeDoc(path.join(t, 'done', 'my-thread-plan-002.md'), { type: 'done', id: 'dn_2', title: 'D2', version: 1, parent_id: 'pl_ULID2' }, '## Step 1');
    await writeDoc(path.join(t, 'chats', 'my-thread-chat-001.md'), { type: 'chat', id: 'ch_1', title: 'C1', version: 1 }, '## User');
    await writeDoc(path.join(t, 'chats', 'my-thread.md'), { type: 'chat', id: 'ch_bare', title: 'Cbare', version: 1 }, '## User'); // ordinal-less
    return root;
}

const deps = (root: string) => ({ getActiveLoomRoot: () => root, fs, loadDoc });
const exists = (root: string, rel: string) => fs.pathExists(path.join(root, rel));

async function run() {
    console.log('🔀 Running migrate-layout tests...\n');

    // ── test 1: dry-run plans the renames but moves nothing ──────────────────
    console.log('  • migrate-layout: --dry-run plans renames, moves nothing...');
    {
        const root = await seedLegacyRepo();
        const res = await migrateLayout({ dryRun: true }, deps(root));
        assert(res.dryRun === true, 'result.dryRun must be true');
        const to = res.renames.map(r => r.to).sort();
        assert(to.includes('loom/wv/my-thread/idea.md'), 'plans idea → idea.md');
        assert(to.includes('loom/wv/my-thread/design.md'), 'plans design → design.md');
        assert(to.includes('loom/wv/my-thread/plans/plan-001.md'), 'plans plan-001');
        assert(to.includes('loom/wv/my-thread/plans/plan-002.md'), 'plans plan-002');
        assert(to.includes('loom/wv/my-thread/done/plan-001-done.md'), 'done via parent_id → plan-001-done');
        assert(to.includes('loom/wv/my-thread/done/plan-002-done.md'), 'done via own ordinal → plan-002-done');
        assert(to.includes('loom/wv/my-thread/chats/chat-001.md'), 'chat keeps ordinal 001');
        // dry-run touched nothing on disk
        assert(await exists(root, 'loom/wv/my-thread/my-thread-idea.md'), 'dry-run leaves legacy idea in place');
        assert(!(await exists(root, 'loom/wv/my-thread/idea.md')), 'dry-run creates no idea.md');
        console.log('    ✅ dry-run planned all renames, disk untouched');
    }

    // ── test 2: real run renames to canonical, preserves content, is idempotent ─
    console.log('  • migrate-layout: renames to canonical, preserves content, idempotent...');
    {
        const root = await seedLegacyRepo();
        const res = await migrateLayout({ dryRun: false }, deps(root));
        assert(res.renames.length >= 8, `expected ≥8 renames, got ${res.renames.length}`);

        // canonical names present, legacy gone
        assert(await exists(root, 'loom/wv/my-thread/idea.md'), 'idea.md created');
        assert(!(await exists(root, 'loom/wv/my-thread/my-thread-idea.md')), 'legacy idea gone');
        assert(await exists(root, 'loom/wv/my-thread/design.md'), 'design.md created');
        assert(await exists(root, 'loom/wv/my-thread/plans/plan-001.md'), 'plan-001.md');
        assert(await exists(root, 'loom/wv/my-thread/plans/plan-002.md'), 'plan-002.md');
        assert(await exists(root, 'loom/wv/my-thread/done/plan-001-done.md'), 'plan-001-done.md');
        assert(await exists(root, 'loom/wv/my-thread/done/plan-002-done.md'), 'plan-002-done.md');
        assert(await exists(root, 'loom/wv/my-thread/req.md'), 'flat req.md untouched');

        // content preserved (identity intact) — the renamed plan still carries pl_ULID1
        const p1 = await loadDoc(path.join(root, 'loom/wv/my-thread/plans/plan-001.md')) as any;
        assert(p1.id === 'pl_ULID1', 'renamed plan keeps its ULID id');

        // chats: one ordinal kept, one bare name assigned a fresh ordinal
        const chatFiles = (await fs.readdir(path.join(root, 'loom/wv/my-thread/chats'))).sort();
        assert(chatFiles.includes('chat-001.md'), 'chat-001 kept');
        assert(chatFiles.some(f => /^chat-\d+\.md$/.test(f) && f !== 'chat-001.md'), 'bare chat got a fresh ordinal');
        assert(chatFiles.length === 2, `exactly 2 chats after migrate, got ${chatFiles.length}`);

        // idempotent: a second run finds nothing to do
        const again = await migrateLayout({ dryRun: false }, deps(root));
        assert(again.renames.length === 0, `second run must be a no-op, got ${again.renames.length} renames`);
        console.log('    ✅ renamed, content preserved, idempotent');
    }

    // ── test 3: collision-safe — never overwrites an existing canonical target ─
    console.log('  • migrate-layout: skips when the canonical target already exists...');
    {
        const root = await seedLegacyRepo();
        // Pre-create the canonical idea.md so the legacy one can't claim it.
        await writeDoc(path.join(root, 'loom', 'wv', 'my-thread', 'idea.md'), { type: 'idea', id: 'id_flat', title: 'Flat', version: 1 }, '# Flat');
        const res = await migrateLayout({ dryRun: false }, deps(root));
        assert(res.skipped.some(s => s.path.endsWith('my-thread-idea.md')), 'legacy idea skipped on collision');
        assert(await exists(root, 'loom/wv/my-thread/my-thread-idea.md'), 'legacy idea left in place on collision');
        const flat = await loadDoc(path.join(root, 'loom/wv/my-thread/idea.md')) as any;
        assert(flat.id === 'id_flat', 'existing idea.md not overwritten');
        console.log('    ✅ collision-safe (no overwrite)');
    }

    // ── test 4: collision-aware renumber — legacy plans/dones sharing an ordinal ─
    console.log('  • migrate-layout: auto-renumbers collisions, loses nothing...');
    {
        const root = TMP;
        await fs.remove(root);
        const t = path.join(root, 'loom', 'wv', 'multi');
        // Three plans: two legacy @001 (collision) + one distinct @002 that must be preserved.
        await writeDoc(path.join(t, 'plans', 'a-plan-001.md'), { type: 'plan', id: 'pl_A', title: 'A', version: 1, created: '2026-07-01' }, '# A');
        await writeDoc(path.join(t, 'plans', 'b-plan-001.md'), { type: 'plan', id: 'pl_B', title: 'B', version: 1, created: '2026-07-02' }, '# B');
        await writeDoc(path.join(t, 'plans', 'c-plan-002.md'), { type: 'plan', id: 'pl_C', title: 'C', version: 1, created: '2026-07-03' }, '# C');
        // Dones: one mirrors pl_A (hard @its-new-ordinal), one legacy @001 with a dead parent (soft) — they contend.
        await writeDoc(path.join(t, 'done', 'pl_A-done.md'), { type: 'done', id: 'pl_A-done', title: 'DA', version: 1, parent_id: 'pl_A' }, '## Step');
        await writeDoc(path.join(t, 'done', 'legacy-x-plan-001.md'), { type: 'done', id: 'dn_x', title: 'DX', version: 1, parent_id: 'pl_GONE' }, '## Step');

        const res = await migrateLayout({ dryRun: false }, deps(root));

        // plans: distinct @002 preserved (c→plan-002); the two @001 renumbered to 001 + first free (003).
        const planFiles = (await fs.readdir(path.join(root, 'loom/wv/multi/plans'))).sort();
        assert(planFiles.length === 3, `3 plans survive, got ${planFiles.length}: ${planFiles.join(',')}`);
        assert(planFiles.includes('plan-002.md'), 'distinct plan-002 preserved');
        assert(new Set(planFiles).size === 3, 'no two plans collapsed onto one name');
        // every plan id still resolvable (nothing lost) — collect ids across the 3 files
        const ids = new Set<string>();
        for (const f of planFiles) ids.add(((await loadDoc(path.join(root, 'loom/wv/multi/plans', f))) as any).id);
        assert(ids.has('pl_A') && ids.has('pl_B') && ids.has('pl_C'), `all plan ids preserved, got ${[...ids].join(',')}`);

        // dones: mirror keeps pl_A's ordinal (001); the legacy soft done renumbered away — 2 distinct files.
        const doneFiles = (await fs.readdir(path.join(root, 'loom/wv/multi/done'))).sort();
        assert(doneFiles.length === 2 && new Set(doneFiles).size === 2, `2 distinct dones survive, got ${doneFiles.join(',')}`);
        assert(doneFiles.includes('plan-001-done.md'), 'done mirrors its plan (pl_A → plan-001-done)');
        const mirror = (await loadDoc(path.join(root, 'loom/wv/multi/done/plan-001-done.md'))) as any;
        assert(mirror.id === 'pl_A-done', 'the mirror done is pl_A-done (hard claim honoured)');

        // collisions surfaced for the audit log: one plans contest + one done contest, all @ordinal 1.
        assert(res.collisions.length === 2, `expected 2 collisions, got ${res.collisions.length}`);
        assert(res.collisions.every(c => c.contested === 1), 'both collisions contended for ordinal 1');
        assert(res.collisions.some(c => c.kind === 'plan') && res.collisions.some(c => c.kind === 'done'), 'a plan and a done collision reported');

        // idempotent after renumber: second run is a no-op.
        const again = await migrateLayout({ dryRun: false }, deps(root));
        assert(again.renames.length === 0, `second run no-op, got ${again.renames.length}`);
        console.log('    ✅ collisions renumbered, ids preserved, mirror honoured, idempotent');
    }

    await fs.remove(TMP);
    console.log('\n✨ All migrate-layout tests passed!');
}

run().catch(e => { console.error(`❌ migrate-layout.test.ts failed: ${e.message}`); process.exit(1); });
