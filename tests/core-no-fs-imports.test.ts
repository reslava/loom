import * as fs from 'fs-extra';
import * as path from 'path';
import { assert } from './test-utils.ts';

// Enforces the keystone layering contract: packages/core is PURE domain logic —
// "No IO. No side effects." Nothing under packages/core/src may import a node
// filesystem module. IO belongs in the fs layer (fs → core is the allowed
// direction, never the reverse). This is the mechanical-enforcement pattern
// (sibling to vscode-no-fs-imports.test.ts) pointed one layer down: it caught the
// ConfigRegistry drift (registry.ts read/wrote ~/.loom/config.yaml from core) and
// keeps the layer from silently drifting again.
//   - Bans: 'fs', 'fs-extra', 'fs/promises', 'node:fs', 'node:fs/promises'.
//   - NO WHITELIST: core is 100% IO-free — there is no justified exception.
// Run from the repo root (test-all cd's there).

const repoRoot = process.cwd();
const SRC = path.join(repoRoot, 'packages', 'core', 'src');

const FORBIDDEN_EXACT = new Set(['fs', 'fs-extra', 'fs/promises', 'node:fs', 'node:fs/promises']);

function forbiddenSource(src: string): string | null {
    if (FORBIDDEN_EXACT.has(src)) return src;
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
    console.log('🔁 Running core purity guard (no fs imports)...\n');
    assert(await fs.pathExists(SRC), `core src not found at ${SRC} — run this test from the repo root.`);

    const files = await walk(SRC);
    assert(files.length > 0, 'no .ts files found under packages/core/src — wrong cwd?');

    const violations: string[] = [];
    for (const file of files) {
        const rel = path.relative(SRC, file).split(path.sep).join('/');
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
        'packages/core is impure — IO leaked into the pure domain layer:\n' +
            violations.map(v => `  • ${v}`).join('\n') +
            '\n  → move the IO into the fs layer (e.g. a repository under packages/fs/src) and have core\n' +
            '    stay types + IO-free helpers only. core must never import a node filesystem module.'
    );
    console.log(`    ✅ ${files.length} files scanned, no fs imports in core`);

    console.log('\n✅ core purity guard passed\n');
}

run().catch(e => { console.error('❌', e); process.exit(1); });
