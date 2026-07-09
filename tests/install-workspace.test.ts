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

        // ── test 7: no-op rerun must NOT rewrite / misreport .loom/CLAUDE.md ──────
        console.log('  • no-op rerun: identical .loom/CLAUDE.md not rewritten, not reported...');
        {
            const dir = await freshProject('loom-install-test-7');
            const r1 = await installWorkspace({}, { fs, registry, cwd: dir });
            assert(r1.claudeMdWritten === true, 'fresh install must write .loom/CLAUDE.md');
            const claudeMdPath = path.join(dir, '.loom', 'CLAUDE.md');
            const beforeMtime = fs.statSync(claudeMdPath).mtimeMs;

            const r2 = await installWorkspace({}, { fs, registry, cwd: dir });
            assert(r2.claudeMdWritten === false, 'no-op rerun must report .loom/CLAUDE.md NOT written');
            assert(fs.statSync(claudeMdPath).mtimeMs === beforeMtime, 'identical .loom/CLAUDE.md must not be rewritten');

            // A drifted contract, by contrast, MUST be rewritten back to canonical.
            fs.writeFileSync(claudeMdPath, '# stale contract\n', 'utf8');
            const r3 = await installWorkspace({}, { fs, registry, cwd: dir });
            assert(r3.claudeMdWritten === true, 'drifted .loom/CLAUDE.md must be rewritten');
            assert(fs.readFileSync(claudeMdPath, 'utf8') !== '# stale contract\n', 'contract must be restored');
            console.log('    ✅ identical contract skipped, drifted contract restored');
        }

        // ── test 8: silent in-shape npx pin-heal (extra servers preserved) ───────
        console.log('  • pin-heal: stale in-shape npx pin bumped, extra servers preserved...');
        {
            const dir = await freshProject('loom-install-test-8');
            await installWorkspace({}, { fs, registry, cwd: dir });
            const mcpPath = path.join(dir, '.mcp.json');
            const fresh = JSON.parse(fs.readFileSync(mcpPath, 'utf8'));
            // Generated .mcp.json must be portable — the ${workspaceFolder} placeholder,
            // never a resolved absolute machine path (Claude Code / VS Code expand it).
            assert(fresh.mcpServers.loom.env.LOOM_ROOT === '${workspaceFolder}', 'generated .mcp.json LOOM_ROOT is the portable ${workspaceFolder}, not an absolute path');
            const canonicalArg = fresh.mcpServers.loom.args.find((a: string) => a.startsWith('@reslava/loom@'));
            // Corrupt to a stale version and add an unrelated server.
            fresh.mcpServers.loom.args = ['-y', '@reslava/loom@0.0.1', 'mcp'];
            fresh.mcpServers.git = { command: 'git-mcp' };
            fs.writeFileSync(mcpPath, JSON.stringify(fresh, null, 2), 'utf8');

            const r = await installWorkspace({}, { fs, registry, cwd: dir });
            const healed = JSON.parse(fs.readFileSync(mcpPath, 'utf8'));
            assert(healed.mcpServers.loom.args.includes(canonicalArg), 'stale npx pin healed to canonical version');
            assert(!!healed.mcpServers.git, 'unrelated server preserved through heal');
            assert(r.mcpJsonWritten === true, 'install reports .mcp.json written when the pin was healed');
            console.log('    ✅ in-shape pin healed, extra server preserved');
        }

        // ── test 9: consented command:"loom" → npx migration (gated by flag) ─────
        console.log('  • migrate: command:"loom" untouched without flag, migrated (env preserved) with it...');
        {
            const dir = await freshProject('loom-install-test-9');
            await installWorkspace({}, { fs, registry, cwd: dir });
            const mcpPath = path.join(dir, '.mcp.json');
            fs.writeFileSync(mcpPath, JSON.stringify({
                mcpServers: { loom: { type: 'stdio', command: 'loom', args: ['mcp'], env: { LOOM_ROOT: dir, EXTRA: 'x' } } },
            }, null, 2), 'utf8');

            const r1 = await installWorkspace({}, { fs, registry, cwd: dir });
            assert(JSON.parse(fs.readFileSync(mcpPath, 'utf8')).mcpServers.loom.command === 'loom', 'command:"loom" untouched without the flag');
            assert(r1.mcpJsonWritten === false, 'no .mcp.json write without the migrate flag');

            const r2 = await installWorkspace({ migrateMcpCommand: true }, { fs, registry, cwd: dir });
            const mig = JSON.parse(fs.readFileSync(mcpPath, 'utf8'));
            assert(mig.mcpServers.loom.command === 'npx', 'migrated command → npx with the flag');
            assert(mig.mcpServers.loom.args.some((a: string) => a.startsWith('@reslava/loom@')), 'migrated args carry the npx pin');
            assert(mig.mcpServers.loom.env.EXTRA === 'x', 'migrated env preserved');
            assert(r2.mcpJsonWritten === true, 'install reports .mcp.json written on migration');

            // Migrating a legacy command:"loom" with NO env sets the portable default.
            const dir2 = await freshProject('loom-install-test-9b');
            await installWorkspace({}, { fs, registry, cwd: dir2 });
            const mcpPath2 = path.join(dir2, '.mcp.json');
            fs.writeFileSync(mcpPath2, JSON.stringify({
                mcpServers: { loom: { type: 'stdio', command: 'loom', args: ['mcp'] } },
            }, null, 2), 'utf8');
            await installWorkspace({ migrateMcpCommand: true }, { fs, registry, cwd: dir2 });
            const mig2 = JSON.parse(fs.readFileSync(mcpPath2, 'utf8'));
            assert(mig2.mcpServers.loom.env.LOOM_ROOT === '${workspaceFolder}', 'migration without prior env sets the portable ${workspaceFolder}');
            console.log('    ✅ migration is flag-gated, preserves env, and defaults to ${workspaceFolder}');
        }

        console.log('\n✨ All install-workspace tests passed!\n');
    }
}

run().catch((err) => {
    console.error('❌ install-workspace.test.ts failed:', err.message);
    process.exit(1);
});
