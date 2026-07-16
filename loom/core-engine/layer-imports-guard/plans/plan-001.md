---
type: plan
id: pl_01KXN8TMN6QMP38NKW71CD5VG3
title: Table-driven layer-imports guard — one resolving check for all package edges
status: done
created: 2026-07-16
updated: 2026-07-16
version: 1
design_version: 5
tags: []
parent_id: de_01KXMYYVB09G1X1556W8GSC7PV
requires_load: []
target_version: 0.1.0
actual_release: 1.27.0
steps:
  - id: wrote-tests-layer-imports-test-ts
    order: 1
    status: done
    description: "Wrote tests/layer-imports.test.ts: a single MATRIX-driven guard over all 7 packages (319 files) enforcing cli/vscode → mcp → app → core + fs + telemetry on two axes (sibling packages + node-fs), with per-file node-fs whitelist and sibling exceptions, whitelist-hygiene, and package-coverage asserts"
    files_touched: []
    blocked_by: []
    satisfies: []
  - id: corrected-the-design-s-specifier-only
    order: 2
    status: done
    description: "Corrected the design's specifier-only scan model: the guard resolves relative imports (path.resolve → packages/<x>/ segment detection) because app/fs/mcp/cli cross-import via relative paths (153/24/185/125 imports) — a specifier-only scan would have passed them vacuously; also catches export…from, and a sweep confirmed zero dynamic import() so the static scan is complete"
    files_touched: []
    blocked_by: []
    satisfies: []
  - id: surfaced-and-resolved-a-live-vscode
    order: 3
    status: done
    description: "Surfaced and resolved a live vscode → fs edge invisible to the old guard: loom-mcp-entry.ts imports ../../fs/dist; agreed with Rafa it is a justified exception (bundled MCP server entry — server boot, not extension UI; MCP-resource routing impossible pre-boot) and encoded it as a documented per-file siblingExceptions entry"
    files_touched: []
    blocked_by: []
    satisfies: []
  - id: subsumed-and-deleted-tests-core-no
    order: 4
    status: done
    description: Subsumed and deleted tests/core-no-fs-imports.test.ts and tests/vscode-no-fs-imports.test.ts, preserving the node-fs whitelist (claudeTerminal.ts, extension.ts) and hygiene checks; swapped their two run_test lines in scripts/test-all.sh for one
    files_touched: []
    blocked_by: []
    satisfies: []
  - id: verified-build-all-green-full-test
    order: 5
    status: done
    description: "Verified: build-all green, full test-all green (23/23), and red-on-violation confirmed for four injected cases (core→fs relative, vscode→app relative, core→node-fs, new package with no MATRIX row), clean tree passing again after each; patched design.md scan-mechanics/matrix/data-model/open-questions to match the implemented reality"
    files_touched: []
    blocked_by: []
    satisfies: []
---
# Table-driven layer-imports guard — one resolving check for all package edges

## Goal

Quick-ship record of 5 completed changes.

---

## Steps

| Done | # | Step | Files touched | Blocked by | Satisfies |
|---|---|---|---|---|---|
| ✅ | 1 | Wrote tests/layer-imports.test.ts: a single MATRIX-driven guard over all 7 packages (319 files) enforcing cli/vscode → mcp → app → core + fs + telemetry on two axes (sibling packages + node-fs), with per-file node-fs whitelist and sibling exceptions, whitelist-hygiene, and package-coverage asserts | — | — | — |
| ✅ | 2 | Corrected the design's specifier-only scan model: the guard resolves relative imports (path.resolve → packages/<x>/ segment detection) because app/fs/mcp/cli cross-import via relative paths (153/24/185/125 imports) — a specifier-only scan would have passed them vacuously; also catches export…from, and a sweep confirmed zero dynamic import() so the static scan is complete | — | — | — |
| ✅ | 3 | Surfaced and resolved a live vscode → fs edge invisible to the old guard: loom-mcp-entry.ts imports ../../fs/dist; agreed with Rafa it is a justified exception (bundled MCP server entry — server boot, not extension UI; MCP-resource routing impossible pre-boot) and encoded it as a documented per-file siblingExceptions entry | — | — | — |
| ✅ | 4 | Subsumed and deleted tests/core-no-fs-imports.test.ts and tests/vscode-no-fs-imports.test.ts, preserving the node-fs whitelist (claudeTerminal.ts, extension.ts) and hygiene checks; swapped their two run_test lines in scripts/test-all.sh for one | — | — | — |
| ✅ | 5 | Verified: build-all green, full test-all green (23/23), and red-on-violation confirmed for four injected cases (core→fs relative, vscode→app relative, core→node-fs, new package with no MATRIX row), clean tree passing again after each; patched design.md scan-mechanics/matrix/data-model/open-questions to match the implemented reality | — | — | — |
---

### Legend

| Symbol | Meaning |
|--------|---------|
| ✅ | Done |
| 🔄 | In Progress |
| 🔳 | Pending |
| ❌ | Cancelled |
