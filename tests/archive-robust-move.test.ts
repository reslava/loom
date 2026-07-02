import { assert } from './test-utils.ts';
import { moveTreeOrThrow } from '../packages/fs/dist/index.js';

/**
 * moveTreeOrThrow is the atomic-or-fail-loud move seam shared by archive /
 * restore / thread-move. The failure it exists to prevent — a copy that lands
 * while the source survives (silent duplicate) — can't be triggered reliably
 * with a real filesystem (it needs an OS file lock), so we drive the helper
 * with an injected fake `fs` whose `move` reproduces each fallback outcome.
 */

type MoveImpl = (paths: Set<string>, src: string, dest: string) => Promise<void>;

function fakeFs(initial: string[], move: MoveImpl) {
    const paths = new Set(initial);
    return {
        _paths: paths,
        pathExists: async (p: string) => paths.has(p),
        ensureDir: async (p: string) => { paths.add(p); },
        remove: async (p: string) => { paths.delete(p); },
        move: (src: string, dest: string, _opts?: unknown) => move(paths, src, dest),
    } as any;
}

const SRC = '/loom/core-engine/thread';
const DEST = '/loom/.archive/core-engine/thread';

async function run() {
    // 1) Happy path — move removes source, creates dest.
    {
        const fs = fakeFs([SRC], async (paths, src, dest) => { paths.delete(src); paths.add(dest); });
        await moveTreeOrThrow(SRC, DEST, fs);
        assert(!fs._paths.has(SRC), 'happy: source should be gone');
        assert(fs._paths.has(DEST), 'happy: dest should exist');
        console.log('✓ happy path: moved, nothing left behind');
    }

    // 2) Copy-leaves-source — move RESOLVES but source survives (the silent-duplicate bug).
    {
        const fs = fakeFs([SRC], async (paths, _src, dest) => { paths.add(dest); /* leaves src */ });
        let threw = false;
        try {
            await moveTreeOrThrow(SRC, DEST, fs);
        } catch (e: any) {
            threw = true;
            assert(/source still present/.test(e.message), 'should flag the surviving source');
        }
        assert(threw, 'copy-leaves-source: must throw, never silently duplicate');
        assert(fs._paths.has(SRC), 'rollback: original source kept intact');
        assert(!fs._paths.has(DEST), 'rollback: the duplicate copy is removed');
        console.log('✓ copy-leaves-source: threw + rolled back (no duplicate)');
    }

    // 3) Move THROWS after copying dest — roll back the partial copy, surface the cause.
    {
        const fs = fakeFs([SRC], async (paths, _src, dest) => { paths.add(dest); throw new Error('EPERM: unlink source'); });
        let threw = false;
        try {
            await moveTreeOrThrow(SRC, DEST, fs);
        } catch (e: any) {
            threw = true;
            assert(/Move failed/.test(e.message) && /EPERM/.test(e.message), 'should surface the underlying cause');
        }
        assert(threw, 'move-throws: must throw');
        assert(fs._paths.has(SRC), 'move-throws: source kept');
        assert(!fs._paths.has(DEST), 'move-throws: partial copy rolled back');
        console.log('✓ move-throws-after-copy: threw + rolled back');
    }

    // 4) A pre-existing dest is NEVER clobbered by rollback.
    {
        const fs = fakeFs([SRC, DEST], async (_paths, _src, _dest) => { throw new Error('dest already exists'); });
        let threw = false;
        try {
            await moveTreeOrThrow(SRC, DEST, fs);
        } catch {
            threw = true;
        }
        assert(threw, 'preexisting-dest: must throw');
        assert(fs._paths.has(DEST), 'preexisting-dest: a dest we did not create is left untouched');
        console.log('✓ pre-existing dest preserved on failure');
    }

    console.log('\nAll archive-robust-move tests passed ✅');
}

run().catch(e => { console.error('❌ archive-robust-move test failed:', e); process.exit(1); });
