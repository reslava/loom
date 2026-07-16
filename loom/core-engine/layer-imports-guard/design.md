---
type: design
id: de_01KXMYYVB09G1X1556W8GSC7PV
title: Single table-driven layer-imports guard for all package dependency rules
status: done
created: 2026-07-16
updated: 2026-07-16
version: 5
idea_version: 1
tags: []
parent_id: id_01KV93ZE152CHPW6CTV8VNPBMG
requires_load: []
---
# Single table-driven layer-imports guard for all package dependency rules

## Overview

One table-driven guard — `tests/layer-imports.test.ts` — replaces the two bespoke import guards (`core-no-fs-imports`, `vscode-no-fs-imports`) and extends mechanical enforcement to **every** package edge, not just the two that happen to have a test today. The allowed-import matrix becomes a single executable constant; `architecture-reference.md` §1 stays its human-readable mirror, kept accurate by the existing doc-sync contract (not by a fragile parity assertion — decision below).

This is internal architecture hygiene: judge it as cheap insurance that the `cli/vscode → mcp → app → core + fs (+ telemetry)` layering cannot drift in a recursive session, not as a user-visible feature.

## The matrix (seeded from architecture-reference.md §1, reconciled against the green tree)

`§1` is normative. The matrix is authored from it, then run against the current tree; every discrepancy is resolved as *either* a real violation to fix *or* a §1 omission to correct — never by silently blessing whatever exists. Result:

| Package | May import (`@reslava-loom/*`) | node-fs |
|---------|-------------------------------|---------|
| `core` | *(none — zero siblings)* | **BANNED** |
| `fs` | `core` | allowed |
| `telemetry` | *(none — leaf infra)* | allowed |
| `app` | `core`, `fs`, `telemetry` | allowed |
| `mcp` | `app`, `core`, `fs`, `telemetry` | allowed |
| `cli` | `app`, `mcp`, `core`, `fs`, `telemetry` | allowed |
| `vscode` | `mcp`, `core` (+ per-file exception: `loom-mcp-entry.ts` → `fs`) | **BANNED** (whitelist: `commands/claudeTerminal.ts`, `extension.ts`) |

**Two fidelity corrections to the idea's 6-row sketch** — surfaced because getting these wrong makes the guard red on a clean tree:

1. **`vscode → core` is allowed, not `mcp`-only.** The current `vscode-no-fs-imports` guard already permits pure-`core` imports ("types + IO-free helpers stay allowed"); the extension imports core *types*. The idea sketched `vscode → mcp`; reality (and §1's intent — no `app`/`fs`, but pure core is fine) is `{ mcp, core }`.
2. **`telemetry` exists and the idea omitted it.** It's a 7th package: a leaf that imports no sibling, and a *permitted target* for `app`/`mcp`/`cli` (the concrete client is built at each delivery entry per §1). Its exact appearance in `mcp`/`cli` rows will be confirmed empirically at implement time (see seeding note) — the table above lists it wherever §1 sanctions it.

**node-fs axis stays scoped to what's proven.** Only `core` and `vscode` ban node filesystem modules (`fs`, `fs-extra`, `fs/promises`, `node:fs`, `node:fs/promises`) — exactly today's two guards. We do **not** newly ban node-fs in `app`/`mcp`/`cli`, even though they route IO through the `fs` layer by convention: that ban isn't guarded today, so asserting it risks red-on-clean-tree and is out of scope for a *subsume-and-extend* change. If desired it's a trivial follow-up (flip the row's flag).

## Data model

A single readable constant drives everything:

```ts
type Rule = {
  allow: Set<string>;                          // sibling package short-names this package may import
  nodeFsBanned: boolean;                        // ban 'fs' | 'fs-extra' | 'fs/promises' | 'node:fs' | 'node:fs/promises'
  nodeFsWhitelist?: Set<string>;                // posix rel-paths under src/ exempt from the node-fs ban
  siblingExceptions?: Record<string, string[]>; // rel-path -> extra sibling packages that one file may import
};
const MATRIX: Record<string, LayerRule> = { core: …, fs: …, telemetry: …, app: …, mcp: …, cli: …, vscode: … };
```

Package short-name ⇄ scoped-import mapping: `@reslava-loom/<name>` → `<name>` (the existing guards already assume the `@reslava-loom/` scope). Intra-package imports are relative paths, so a `@reslava-loom/*` specifier is always cross-package — a package importing its own scope name is treated as self/allowed.

## Scan mechanics (resolving, not specifier-only — corrected at implement time)

**Implementation finding:** the engine packages import each other via **relative paths** (`from '../../core/dist'` — app 153, mcp 185, cli 125, fs 24 such imports), not `@reslava-loom/*` specifiers (only `vscode` uses those). A specifier-only scan would therefore pass `app`/`fs`/`mcp`/`cli` **vacuously**. The sibling axis must *resolve* imports:

- `walk(dir)` — recurse `packages/<pkg>/src`, collect `.ts` files (lifted from the old guards).
- `SPEC_RE` — extended to match `from '…'`, `require('…')`, bare `import '…'`, **and `export … from '…'`**; a repo sweep confirmed **zero dynamic `import()`** anywhere, so the static scan is complete.

For each package row, walk its `src`, and for every specifier `s` in every file:
- **node-fs:** if `row.nodeFsBanned` and `s ∈ NODE_FS` and the file is not in `row.nodeFsWhitelist` → violation. (node-fs specifiers are always bare — no resolution needed.)
- **sibling packages:** resolve `s` to a target package — via the `@reslava-loom/<x>` (and `@reslava/loom`, `loom-vscode`) name map, **or**, for a relative specifier, by `path.resolve`-ing it against the importing file and detecting the `packages/<x>/` segment it lands in. If the target is a different package not in `row.allow` (nor in the file's `siblingExceptions`) → violation.

Each violation reports `pkg/rel-path imports '<spec>'` plus a row-specific remediation hint (preserving the actionable wording the current guards have — e.g. core → "move IO into the fs layer"; vscode → "route through the MCP client, or add to WHITELIST with a reason").

## Two completeness guards (the anti-drift teeth)

Beyond the per-edge scan, the test also asserts the *frame* can't be escaped:

1. **Whitelist hygiene** (preserved from `vscode-no-fs-imports`): every `fileWhitelist` entry must still exist on disk — a moved/removed file fails loudly so the exception can't rot.
2. **Package coverage** (new): every `packages/*/` directory that has a `src/` must have a `MATRIX` row. Add a new package with no row and the test goes red — closing the exact "new edge, no guard" gap that let the `ConfigRegistry` leak sit unnoticed.

## Matrix ↔ doc parity — decision: **Option B (single source of truth + cross-reference)**

Confirmed with Rafa. The `MATRIX` constant is the **sole executable source of truth**. `architecture-reference.md` §1 remains an accurate prose description and is kept current by the **existing hard doc-sync contract** (CLAUDE.md's *"Package layers / architecture"* row already lists `architecture-reference.md` as a must-update-in-the-same-commit doc). So §1 is *already contractually required to stay accurate* — there is nothing to add on the enforcement side.

Rejected **Option A (mechanical prose-parsing parity, à la `claude-md-sync.test.ts`)**: that pattern earns its brittleness only when *both* sides are authored prose that must stay verbatim-aligned. Here one side is executable code, so the clean move is to make it canonical and demote §1 to a description pointing at it — not to parse a dependency matrix out of English (which would force a machine-readable block into §1 for a 7-row table). The test file's header comment names §1 as its prose mirror and the doc-sync row as the enforcement, closing the loop without fragile parsing.

## Subsumption & wiring

- **Delete** `tests/core-no-fs-imports.test.ts` and `tests/vscode-no-fs-imports.test.ts` (folded in — no duplicate `walk`/`SPEC_RE` left behind).
- **Preserve** the vscode whitelist (`claudeTerminal.ts`, `extension.ts`) as the `vscode` row's `fileWhitelist`, with the same "justified out-of-loom / pre-MCP-bootstrap write" rationale in a comment.
- **`scripts/test-all.sh`:** remove the two `run_test tests/{core,vscode}-no-fs-imports.test.ts` lines (currently lines 202 & 207), add one `run_test tests/layer-imports.test.ts`.

## Success criteria

- `tests/layer-imports.test.ts` encodes the full matrix + both completeness guards and is wired into `test-all.sh`.
- **Green on the current tree** — the matrix matches reality and §1 (including the two fidelity corrections and telemetry).
- Goes **red** on any reintroduced violation: `core` importing `fs`, `vscode` importing `app`, `fs` importing `app`, or a new `packages/*` added with no row.
- The two bespoke guards are removed with vscode whitelist behavior and whitelist-hygiene both preserved.
- Header comment cross-references §1 as the prose mirror and the doc-sync row as its keeper.

## Seeding note (implementation)

Author the matrix from §1, run the scan, and treat every red as a decision: a real layering bug to fix, or a §1-sanctioned import the row must list (e.g. confirming whether `mcp`/`cli` actually import `@reslava-loom/telemetry` today). Do **not** snapshot current imports as the matrix — that would bless whatever exists and defeat the guard. The end state is: matrix = §1's rules, and the tree conforms.

## Open questions — all resolved at implement time

- **Telemetry membership:** the resolver-verified sweep confirmed `mcp` and `cli` both import `telemetry` — both rows list it.
- **The one real finding:** `vscode/src/loom-mcp-entry.ts` imports `../../fs/dist` — a live `vscode → fs` edge the old specifier-only guard was blind to. Decision (with Rafa): it is a **justified exception** — the file is the bundled MCP server entry (`dist/loom-mcp.js`), server code that resolves the workspace root *before* the server exists (bootstrap: it cannot use an MCP resource that it is itself about to create; moving `resolveLoomRoot` to `app` would only relocate the forbidden edge). Encoded as a per-file `siblingExceptions` entry with that reason; the alternative (hoisting the entry into its own package/bucket) was rejected as churn for one bootstrap file — revisit only if `packages/vscode/` grows a second server-side file.
