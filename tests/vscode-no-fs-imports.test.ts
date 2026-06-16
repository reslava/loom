import * as fs from 'fs-extra';
import * as path from 'path';
import { assert } from './test-utils.ts';

// Enforces the layering boundary the loom-mcp-gate hook can't see: the VS Code
// extension must reach Loom only through the MCP client (vscode → mcp → app),
// never node fs modules or the IO/app layer packages directly. Pure core
// (types + IO-free helpers in @reslava-loom/core) and the MCP client stay allowed.
//   - Bans: 'fs', 'fs-extra', 'node:fs', 'fs/promises', '@reslava-loom/app', '@reslava-loom/fs'.
//   - WHITELIST: a small set of files with a justified node-fs need (tmpfile, pre-MCP bootstrap).
// Run from the repo root (test-all cd's there).

const repoRoot = process.cwd();
const SRC = path.join(repoRoot, 'packages', 'vscode', 'src');

// Files permitted to import node fs — justified, out-of-loom / pre-MCP writes.
// Keyed by path relative to packages/vscode/src, posix-separated.
const WHITELIST = new Set<string>([
    'commands/claudeTerminal.ts', // writes a prompt tmpfile to os.tmpdir() to feed the Claude CLI
    'extension.ts',               // activation/bootstrap: probes .loom/ config before the MCP client exists
]);

const FORBIDDEN_EXACT = new Set(['fs', 'fs-extra', 'fs/promises', 'node:fs', 'node:fs/promises']);

function forbiddenSource(src: string): string | null {
    if (FORBIDDEN_EXACT.has(src)) return src;
    if (src === '@reslava-loom/app' || src.startsWith('@reslava-loom/app/')) return src;
    if (src === '@reslava-loom/fs' || src.startsWith('@reslava-loom/fs/')) return src;
    return null;
}

async function walk(dir: string): Promise<string[]> {
    const out: string[] = [];
    for (const entry of await fs.readdir(dir, { withFileTypes: true })) {
        const p = path.join(dir, entry.name);
        if (entry.isDirectory()) out.push(...await walk(p));
        else if (entry.name.endsWith('.ts')) out.push(p);
    }
    return out;
}

// Matches the module specifier of `from '…'`, `require('…')`, and bare `import '…'`.
const SPEC_RE = /(?:from\s*|require\s*\(\s*|import\s*)['"]([^'"]+)['"]/g;

async function run() {
    console.log('🔁 Running VS Code extension import guard (no fs / no app)...\n');
    assert(await fs.pathExists(SRC), `extension src not found at ${SRC} — run this test from the repo root.`);

    const files = await walk(SRC);
    assert(files.length > 0, 'no .ts files found under packages/vscode/src — wrong cwd?');

    const violations: string[] = [];
    for (const file of files) {
        const rel = path.relative(SRC, file).split(path.sep).join('/');
        if (WHITELIST.has(rel)) continue;
        const text = await fs.readFile(file, 'utf8');
        SPEC_RE.lastIndex = 0;
        let m: RegExpExecArray | null;
        while ((m = SPEC_RE.exec(text)) !== null) {
            const bad = forbiddenSource(m[1]);
            if (bad) violations.push(`${rel} imports '${bad}'`);
        }
    }

    assert(
        violations.length === 0,
        'VS Code extension reaches around the MCP boundary (vscode → mcp → app):\n' +
            violations.map(v => `  • ${v}`).join('\n') +
            '\n  → route through the MCP client (getMCP(root).callTool / readResource) instead of fs / @reslava-loom/{app,fs}.\n' +
            '  If a file legitimately needs node fs (tmpfile, pre-MCP bootstrap), add it to WHITELIST with a reason.'
    );
    console.log(`    ✅ ${files.length} files scanned, no forbidden imports (whitelist: ${[...WHITELIST].join(', ')})`);

    // Whitelist hygiene: a stale entry (file moved/removed) must fail loudly.
    for (const w of WHITELIST) {
        assert(await fs.pathExists(path.join(SRC, w)), `stale WHITELIST entry: ${w} no longer exists — remove it`);
    }
    console.log('    ✅ whitelist entries all exist');

    console.log('\n✅ VS Code extension import guard passed\n');
}

run().catch(e => { console.error('❌', e); process.exit(1); });
