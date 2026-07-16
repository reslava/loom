---
type: idea
id: id_01KV93ZE152CHPW6CTV8VNPBMG
title: Single table-driven layer-imports guard for all package dependency rules
status: done
created: 2026-06-16
version: 1
tags: []
parent_id: null
requires_load: []
---
# Single table-driven layer-imports guard for all package dependency rules

## Problem

We enforce the package layering contract with **bespoke, copy-pasted** guard tests: `tests/vscode-no-fs-imports.test.ts` and `tests/core-no-fs-imports.test.ts`. Each covers exactly one boundary, and both duplicate the same `walk` + import-specifier scan (`SPEC_RE`). The remaining dependency rules — `app`, `fs`, `cli`, `mcp` — have **no mechanical guard at all**; they hold today only by convention. A recursive AI session can erode them silently — the exact drift class that produced the `ConfigRegistry` IO leak the `core-purity` thread just fixed (a guard existed for `vscode` but not for `core`, so the leak went unnoticed until an audit).

## Why it matters

The `cli/vscode → mcp → app → core + fs` layering is the keystone of the design. The principle "discovery moves out of live recursive sessions, into test-all" only holds if **every** edge is checked, not just two. A single source of truth for the allowed-import matrix is also DRY: today the rules live in prose (`architecture-reference.md` §1) **and** in two partial test files. They should live once, executable, and cross-checked against the doc.

This is internal architecture hygiene — not a user-visible feature. Judge it as cheap insurance that the layering can't drift in a recursive session, not against the vision. It is explicitly *not urgent*: the `app`/`fs`/`core` edges have never drifted. Scheduling is the user's call.

## Desired outcome

One `tests/layer-imports.test.ts` driven by an explicit, readable matrix:

```
core   → (no sibling packages)        + node-fs BANNED
fs     → core                         + node-fs allowed
app    → core, fs
mcp    → app, core, fs                (mutation gate; read paths compose core + fs)
cli    → app, mcp, core, fs
vscode → mcp                          + node-fs BANNED (tmpfile/bootstrap whitelist)
```

Walk each `packages/*/src`, and for every `.ts` file flag any `@reslava-loom/*` or node-fs import not permitted by that package's row. Reuse the `walk` + `SPEC_RE` import-specifier scan already proven in the two existing guards.

The two bespoke guards are **subsumed** and deleted (no duplicate scanning logic left behind): fs-purity becomes the `core`/`vscode` rows plus the node-fs axis; the vscode tmpfile/pre-MCP-bootstrap whitelist is preserved as a per-file exception in the matrix model.

## Success criteria

- `tests/layer-imports.test.ts` encodes the full matrix above and is wired into `scripts/test-all.sh`.
- Green on the current tree — the matrix matches reality (and matches the corrected dependency rules in `architecture-reference.md` §1, which already reflect that `mcp` legitimately imports `core` + `fs` for reads).
- Goes **red** on any reintroduced violation: e.g. `core` importing `fs`, `vscode` importing `app`, `fs` importing `app`.
- `tests/core-no-fs-imports.test.ts` and `tests/vscode-no-fs-imports.test.ts` are removed (folded in), with the vscode whitelist behavior preserved.
- A note (or a lightweight assertion) keeps the matrix and `architecture-reference.md` §1 in sync, so the prose and the executable guard can't drift from each other — the same parity discipline used for the two CLAUDE.md surfaces.

## Open question for design

Whether to additionally assert matrix↔doc parity mechanically (like `claude-md-sync.test.ts` does for the CLAUDE.md surfaces) or just leave a cross-reference comment. Defer to the design phase.
