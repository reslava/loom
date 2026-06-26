import * as fs from 'fs-extra';
import * as path from 'path';
import * as os from 'os';
import { assert } from './test-utils.ts';
import { installWorkspace } from '../packages/app/dist/installWorkspace.js';

// installWorkspace's only registry consumer is initLocal, which ignores its
// registry dep entirely on the local path — so a stub keeps the test hermetic
// (no touching the developer's global ~/.loom registry). cwd is injected through
// to initLocal, so the use-case is process.cwd()-pure and needs no chdir here.
const registry = {} as any;

function countOccurrences(haystack: string, needle: string): number {
    return haystack.split(needle).length - 1;
}

async function freshProject(name: string): Promise<string> {
    const dir = path.join(os.tmpdir(), name);
    await fs.remove(dir);
    await fs.ensureDir(dir);
    return dir;
}

async function run() {
    console.log('🧩 Running install-workspace tests (CLAUDE-LOCAL.md ownership)...\n');

    {
        // ── test 1: fresh install creates CLAUDE-LOCAL.md and both imports ────────
        console.log('  • fresh install: CLAUDE-LOCAL.md created, root CLAUDE.md imports both...');
        {
            const dir = await freshProject('loom-install-test-1');
            const r = await installWorkspace({}, { fs, registry, cwd: dir });
            assert(r.claudeLocalMdWritten === true, 'fresh install must create CLAUDE-LOCAL.md');
            assert(fs.existsSync(path.join(dir, 'CLAUDE-LOCAL.md')), 'CLAUDE-LOCAL.md must exist');
            const root = fs.readFileSync(path.join(dir, 'CLAUDE.md'), 'utf8');
            assert(root.includes('@.loom/CLAUDE.md'), 'root CLAUDE.md must import the Loom contract');
            assert(root.includes('@CLAUDE-LOCAL.md'), 'root CLAUDE.md must import CLAUDE-LOCAL.md');
            assert(
                root.indexOf('@.loom/CLAUDE.md') < root.indexOf('@CLAUDE-LOCAL.md'),
                'Loom contract import must come before the local import'
            );
            console.log('    ✅ fresh install creates CLAUDE-LOCAL.md + both imports in order');
        }

        // ── test 2: rerun never overwrites user rules, never duplicates imports ───
        console.log('  • rerun: user CLAUDE-LOCAL.md preserved, imports not duplicated...');
        {
            const dir = await freshProject('loom-install-test-2');            await installWorkspace({}, { fs, registry, cwd: dir });
            const localPath = path.join(dir, 'CLAUDE-LOCAL.md');
            const sentinel = '# MY OWN RULES\nNever delete these.\n';
            fs.writeFileSync(localPath, sentinel, 'utf8');

            const r2 = await installWorkspace({}, { fs, registry, cwd: dir });
            assert(r2.claudeLocalMdWritten === false, 'rerun must not rewrite an existing CLAUDE-LOCAL.md');
            assert(fs.readFileSync(localPath, 'utf8') === sentinel, 'user CLAUDE-LOCAL.md content must be preserved');
            const root = fs.readFileSync(path.join(dir, 'CLAUDE.md'), 'utf8');
            assert(countOccurrences(root, '@.loom/CLAUDE.md') === 1, 'loom import must not duplicate on rerun');
            assert(countOccurrences(root, '@CLAUDE-LOCAL.md') === 1, 'local import must not duplicate on rerun');
            console.log('    ✅ rerun preserves user rules, no duplicate imports');
        }

        // ── test 3: --force still never clobbers user CLAUDE-LOCAL.md ─────────────
        console.log('  • --force: CLAUDE-LOCAL.md left untouched (user-owned, outside force set)...');
        {
            const dir = await freshProject('loom-install-test-3');            await installWorkspace({}, { fs, registry, cwd: dir });
            const localPath = path.join(dir, 'CLAUDE-LOCAL.md');
            const sentinel = '# MY OWN RULES (force test)\n';
            fs.writeFileSync(localPath, sentinel, 'utf8');

            const r3 = await installWorkspace({ force: true }, { fs, registry, cwd: dir });
            assert(r3.claudeLocalMdWritten === false, '--force must not rewrite CLAUDE-LOCAL.md');
            assert(fs.readFileSync(localPath, 'utf8') === sentinel, 'CLAUDE-LOCAL.md must survive --force');
            console.log('    ✅ --force leaves CLAUDE-LOCAL.md untouched');
        }

        // ── test 4: pre-existing root CLAUDE.md body preserved + both imports once ─
        console.log('  • existing root CLAUDE.md: body preserved, both imports added once...');
        {
            const dir = await freshProject('loom-install-test-4');            const userBody = '# My Project\nProject-specific guidance.\n';
            fs.writeFileSync(path.join(dir, 'CLAUDE.md'), userBody, 'utf8');

            await installWorkspace({}, { fs, registry, cwd: dir });
            const root = fs.readFileSync(path.join(dir, 'CLAUDE.md'), 'utf8');
            assert(root.includes(userBody.trim()), 'pre-existing root CLAUDE.md body must be preserved');
            assert(countOccurrences(root, '@.loom/CLAUDE.md') === 1, 'loom import added exactly once');
            assert(countOccurrences(root, '@CLAUDE-LOCAL.md') === 1, 'local import added exactly once');
            console.log('    ✅ existing root CLAUDE.md preserved + both imports added once');
        }

        // ── test 5: partial — only the loom import present → gains the local one ──
        console.log('  • partial imports: root CLAUDE.md with only @.loom/CLAUDE.md gains the local import...');
        {
            const dir = await freshProject('loom-install-test-5');            fs.writeFileSync(path.join(dir, 'CLAUDE.md'), '@.loom/CLAUDE.md\n\n# legacy\n', 'utf8');

            const r5 = await installWorkspace({}, { fs, registry, cwd: dir });
            assert(r5.rootClaudeMdPatched === true, 'must patch when one import is missing');
            const root = fs.readFileSync(path.join(dir, 'CLAUDE.md'), 'utf8');
            assert(countOccurrences(root, '@.loom/CLAUDE.md') === 1, 'existing loom import must not duplicate');
            assert(countOccurrences(root, '@CLAUDE-LOCAL.md') === 1, 'missing local import must be added once');
            console.log('    ✅ partial import file gains only the missing import');
        }

        // ── test 6: both imports already present → no patch, no duplication ──────
        console.log('  • idempotent: both imports already present → no patch...');
        {
            const dir = await freshProject('loom-install-test-6');            fs.writeFileSync(path.join(dir, 'CLAUDE.md'), '@.loom/CLAUDE.md\n@CLAUDE-LOCAL.md\n\n# body\n', 'utf8');

            const r6 = await installWorkspace({}, { fs, registry, cwd: dir });
            assert(r6.rootClaudeMdPatched === false, 'no patch when both imports already present');
            const root = fs.readFileSync(path.join(dir, 'CLAUDE.md'), 'utf8');
            assert(countOccurrences(root, '@.loom/CLAUDE.md') === 1, 'loom import stays single');
            assert(countOccurrences(root, '@CLAUDE-LOCAL.md') === 1, 'local import stays single');
            console.log('    ✅ idempotent when both imports already present');
        }

        console.log('\n✨ All install-workspace tests passed!\n');
    }
}

run().catch((err) => {
    console.error('❌ install-workspace.test.ts failed:', err.message);
    process.exit(1);
});
