import * as fs from 'fs-extra';
import * as path from 'path';
import { assert } from './test-utils.ts';

// Single table-driven guard for EVERY package dependency edge — the executable
// mirror of architecture-reference.md §1 ("Dependency rules (Stage 2)"). It
// subsumes the two former bespoke guards (core-no-fs-imports, vscode-no-fs-imports)
// and extends mechanical enforcement to all edges, so the
// `cli/vscode → mcp → app → core + fs (+ telemetry)` layering can't drift in a
// recursive session — the exact drift class that produced the ConfigRegistry IO leak.
//
// SINGLE SOURCE OF TRUTH: the MATRIX below is canonical. architecture-reference.md
// §1 is its human-readable description, kept accurate by the doc-sync contract in
// CLAUDE.md ("Package layers / architecture" must update in the same commit). We do
// NOT parse §1 back (Option B): one side is executable code, so it is the truth and
// §1 points at it — no fragile prose-parsing (contrast claude-md-sync.test.ts, where
// BOTH sides are authored prose and must stay verbatim-aligned).
//
// Two axes per package:
//   • node-fs axis  — may this package import a node filesystem module? (bare specifier)
//   • sibling axis  — which @reslava-loom/* packages may it import? Resolved from BOTH
//                     `@reslava-loom/<x>` specifiers AND relative paths that escape into
//                     another packages/<x>/ (how app/fs/mcp/cli actually import siblings).
//                     A specifier-only scan would pass those packages vacuously.
//
// Run from the repo root (test-all cd's there).

const ROOT = process.cwd();
const PACKAGES_DIR = path.join(ROOT, 'packages');

const NODE_FS = new Set(['fs', 'fs-extra', 'fs/promises', 'node:fs', 'node:fs/promises']);

// Package short-name for each publishable name that may appear as an import specifier.
// (cli = @reslava/loom, vscode = loom-vscode are never imported as deps, but mapped for completeness.)
const NAME_TO_PKG: Record<string, string> = {
    '@reslava-loom/core': 'core',
    '@reslava-loom/fs': 'fs',
    '@reslava-loom/telemetry': 'telemetry',
    '@reslava-loom/app': 'app',
    '@reslava-loom/mcp': 'mcp',
    '@reslava/loom': 'cli',
    'loom-vscode': 'vscode',
};

type Rule = {
    allow: Set<string>;                         // sibling packages this package may import
    nodeFsBanned: boolean;                       // ban a node filesystem module import
    nodeFsWhitelist?: Set<string>;               // src-relative posix paths exempt from the node-fs ban
    siblingExceptions?: Record<string, string[]>; // src-relative posix path -> extra sibling packages it may import
};

// The dependency matrix. Mirrors architecture-reference.md §1.
const MATRIX: Record<string, Rule> = {
    // Pure domain logic: zero siblings, zero node IO.
    core: { allow: new Set(), nodeFsBanned: true },
    // Infra: fs → core only. node-fs is its whole job.
    fs: { allow: new Set(['core']), nodeFsBanned: false },
    // Leaf infra: imports no sibling; injected via deps.
    telemetry: { allow: new Set(), nodeFsBanned: false },
    // Use-cases over core + fs + telemetry.
    app: { allow: new Set(['core', 'fs', 'telemetry']), nodeFsBanned: false },
    // Mutation gate; read paths compose core + fs; builds a telemetry client.
    mcp: { allow: new Set(['app', 'core', 'fs', 'telemetry']), nodeFsBanned: false },
    // Delivery: calls app, reaches mcp in-process, reads core/fs types, builds telemetry.
    cli: { allow: new Set(['app', 'core', 'fs', 'mcp', 'telemetry']), nodeFsBanned: false },
    // Human UI: reaches Loom ONLY through mcp; pure-core types allowed. node-fs banned.
    vscode: {
        allow: new Set(['core', 'mcp']),
        nodeFsBanned: true,
        // Justified out-of-loom / pre-MCP-bootstrap node-fs writes.
        nodeFsWhitelist: new Set([
            'commands/claudeTerminal.ts', // writes a prompt tmpfile to os.tmpdir() to feed the Claude CLI
            'extension.ts',               // activation/bootstrap: probes .loom/ config before the MCP client exists
        ]),
        // loom-mcp-entry.ts is NOT extension UI — it is the bundled MCP server entry
        // (dist/loom-mcp.js), server code that legitimately composes the engine and
        // resolves the workspace root before the server exists. It lives in packages/vscode/
        // only so esbuild can bundle it into the VSIX. It plays by server rules, not UI rules.
        siblingExceptions: {
            'loom-mcp-entry.ts': ['fs'], // bundled MCP server entry — server boot, not extension UI
        },
    },
};

// Matches the module specifier of `from '…'`, `require('…')`, bare `import '…'`, and `export … from '…'`.
const SPEC_RE = /(?:from\s*|require\s*\(\s*|import\s*|export\s+[^;]*?from\s*)['"]([^'"]+)['"]/g;

async function walk(dir: string): Promise<string[]> {
    const out: string[] = [];
    for (const entry of await fs.readdir(dir, { withFileTypes: true })) {
        const p = path.join(dir, entry.name);
        if (entry.isDirectory()) out.push(...await walk(p));
        else if (entry.name.endsWith('.ts')) out.push(p);
    }
    return out;
}

// The package a resolved absolute path belongs to (packages/<x>/…), or null if outside packages/.
function pkgOfPath(abs: string): string | null {
    const rel = path.relative(PACKAGES_DIR, abs).split(path.sep).join('/');
    if (rel.startsWith('..')) return null;
    const seg = rel.split('/')[0];
    return seg || null;
}

// Resolve an import specifier to the sibling package it targets (or null if not a cross-package
// @reslava-loom import). `file` is the importing file's absolute path; `pkg` its owning package.
function targetPackage(spec: string, file: string, pkg: string): string | null {
    for (const [name, short] of Object.entries(NAME_TO_PKG)) {
        if (spec === name || spec.startsWith(name + '/')) return short === pkg ? null : short;
    }
    if (spec.startsWith('./') || spec.startsWith('../')) {
        const tp = pkgOfPath(path.resolve(path.dirname(file), spec));
        return tp && tp !== pkg ? tp : null;
    }
    return null;
}

async function run() {
    console.log('🔁 Running layer-imports guard (all package dependency edges)...\n');
    assert(await fs.pathExists(PACKAGES_DIR), `packages/ not found at ${PACKAGES_DIR} — run from the repo root.`);

    // Coverage: every packages/* with a src/ must have a MATRIX row. A new package added
    // with no row goes red here — closing the "new edge, no guard" gap.
    const pkgDirs: string[] = [];
    for (const entry of await fs.readdir(PACKAGES_DIR, { withFileTypes: true })) {
        if (entry.isDirectory() && await fs.pathExists(path.join(PACKAGES_DIR, entry.name, 'src'))) {
            pkgDirs.push(entry.name);
        }
    }
    const missing = pkgDirs.filter(p => !MATRIX[p]);
    assert(
        missing.length === 0,
        `packages/ has src dirs with no MATRIX row (add them to tests/layer-imports.test.ts + architecture-reference.md §1):\n` +
            missing.map(p => `  • ${p}`).join('\n')
    );

    const violations: string[] = [];
    let scanned = 0;

    for (const pkg of pkgDirs) {
        const rule = MATRIX[pkg];
        const src = path.join(PACKAGES_DIR, pkg, 'src');
        for (const file of await walk(src)) {
            scanned++;
            const rel = path.relative(src, file).split(path.sep).join('/');
            const nodeFsAllowedHere = !rule.nodeFsBanned || rule.nodeFsWhitelist?.has(rel);
            const extraSiblings = rule.siblingExceptions?.[rel] ?? [];
            const text = await fs.readFile(file, 'utf8');
            SPEC_RE.lastIndex = 0;
            let m: RegExpExecArray | null;
            while ((m = SPEC_RE.exec(text)) !== null) {
                const spec = m[1];
                if (NODE_FS.has(spec)) {
                    if (!nodeFsAllowedHere) violations.push(`[node-fs] ${pkg}/${rel} imports '${spec}'`);
                    continue;
                }
                const tgt = targetPackage(spec, file, pkg);
                if (tgt && !rule.allow.has(tgt) && !extraSiblings.includes(tgt)) {
                    violations.push(`[layer]  ${pkg}/${rel} imports ${tgt} ('${spec}') — ${pkg} may import {${[...rule.allow].sort().join(', ') || '∅'}}`);
                }
            }
        }
    }

    assert(
        violations.length === 0,
        'Package layering violated (cli/vscode → mcp → app → core + fs + telemetry):\n' +
            violations.map(v => `  • ${v}`).join('\n') +
            '\n  → route through an allowed layer; if an edge is legitimately new, update MATRIX' +
            '\n    in tests/layer-imports.test.ts AND architecture-reference.md §1 in the same commit.'
    );
    console.log(`    ✅ ${scanned} files scanned across ${pkgDirs.length} packages, no forbidden imports`);

    // Whitelist / exception hygiene: a stale entry (file moved/removed) must fail loudly.
    for (const [pkg, rule] of Object.entries(MATRIX)) {
        const src = path.join(PACKAGES_DIR, pkg, 'src');
        for (const w of rule.nodeFsWhitelist ?? []) {
            assert(await fs.pathExists(path.join(src, w)), `stale node-fs whitelist entry: ${pkg}/${w} no longer exists — remove it`);
        }
        for (const w of Object.keys(rule.siblingExceptions ?? {})) {
            assert(await fs.pathExists(path.join(src, w)), `stale sibling exception: ${pkg}/${w} no longer exists — remove it`);
        }
    }
    console.log('    ✅ whitelist / exception entries all exist');

    console.log('\n✅ layer-imports guard passed\n');
}

run().catch(e => { console.error('❌', e); process.exit(1); });
