import * as fs from 'fs-extra';
import * as path from 'path';
import * as os from 'os';
import { assert } from './test-utils.ts';
import { resolveLoomRoot, loomRootNotice } from '../packages/fs/dist/index.js';

async function freshDir(name: string): Promise<string> {
    const dir = path.join(os.tmpdir(), name);
    await fs.remove(dir);
    await fs.ensureDir(dir);
    // path.resolve to normalize any drive-letter / symlink casing so equality holds.
    return path.resolve(dir);
}

async function run() {
    console.log('🧭 Running resolve-loom-root tests...\n');

    // ── 1: an explicit, concrete LOOM_ROOT wins outright (source 'env', no notice) ──
    console.log('  • explicit concrete LOOM_ROOT is used as-is...');
    {
        const r = resolveLoomRoot({ LOOM_ROOT: '/explicit/root' }, '/somewhere/else');
        assert(r.root === '/explicit/root', 'explicit LOOM_ROOT is returned verbatim');
        assert(r.source === 'env', 'source is env');
        assert(loomRootNotice(r.source, r.root, '/somewhere/else') === null, 'no notice for an explicit env root');
    }

    // ── 2: an unexpanded ${…} placeholder is ignored → walk-up used ────────────────
    console.log('  • unexpanded ${…} LOOM_ROOT is ignored, discovery runs instead...');
    {
        const root = await freshDir('resolve-loom-root-placeholder');
        await fs.ensureDir(path.join(root, '.loom'));
        const r = resolveLoomRoot({ LOOM_ROOT: '${workspaceFolder}' }, root);
        assert(r.root === root, '${…} placeholder is treated as unset — root discovered by walk-up');
        assert(r.source === 'ancestor', 'source is ancestor (found via discovery, not env)');
        // cwd === root here, so the ancestor notice is silent.
        assert(loomRootNotice(r.source, r.root, root) === null, 'no notice when launched at the root itself');
    }

    // ── 3: launched from a SUBDIR → walk up to the ancestor with .loom/ (+ notice) ──
    console.log('  • subdirectory launch resolves to the project root, with an info notice...');
    {
        const root = await freshDir('resolve-loom-root-subdir');
        await fs.ensureDir(path.join(root, '.loom'));
        const sub = path.join(root, 'packages', 'deep');
        await fs.ensureDir(sub);
        const r = resolveLoomRoot({}, sub);
        assert(r.root === root, 'walk-up from a subdir resolves to the nearest ancestor with .loom/');
        assert(r.source === 'ancestor', 'source is ancestor');
        const notice = loomRootNotice(r.source, r.root, sub);
        assert(notice !== null && notice.includes(root), 'a subdir launch emits an info notice naming the resolved root');
    }

    // ── 4: no .loom/ anywhere up the tree → cwd-fallback (+ warning notice) ─────────
    console.log('  • no workspace found → defaults to cwd with a warning...');
    {
        const bare = await freshDir('resolve-loom-root-bare');
        const r = resolveLoomRoot({}, bare);
        assert(r.root === bare, 'no .loom/ found → defaults to cwd');
        assert(r.source === 'cwd-fallback', 'source is cwd-fallback');
        const notice = loomRootNotice(r.source, r.root, bare);
        assert(notice !== null && notice.includes('.loom'), 'cwd-fallback emits a warning about the missing .loom/');
    }

    console.log('\n✨ All resolve-loom-root tests passed!\n');
}

run().catch((err) => {
    console.error('❌ resolve-loom-root.test.ts failed:', err.message);
    process.exit(1);
});
