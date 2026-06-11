---
type: plan
id: pl_01KTTR6XZYBZJ0HDK4HQKB79AS
title: CLAUDE.md two-surface sync
status: implementing
created: "2026-06-11T00:00:00.000Z"
updated: 2026-06-11
version: 1
design_version: 1
tags: []
parent_id: null
requires_load: []
target_version: 0.1.0
steps:
  - id: extract-shared-contract-core
    order: 1
    status: pending
    description: Extract the shared (project-agnostic) session-contract sections into one canonical file and bracket the injection point in both surfaces with markers.
    files_touched: [CLAUDE.md, packages/app/src/installWorkspace.ts, scripts/claude-md/contract-core.md]
    blocked_by: []
    satisfies: []
  - id: sync-script-inject-check
    order: 2
    status: pending
    description: Write scripts/sync-claude-md.ts that injects the canonical core between the markers in both surfaces; idempotent, with a --check mode.
    files_touched: [scripts/sync-claude-md.ts]
    blocked_by: [Extract shared contract core]
    satisfies: []
  - id: wire-drift-check-into-test-all
    order: 3
    status: pending
    description: Add a test that runs the sync in --check mode and fail test-all on drift.
    files_touched: [tests/claude-md-sync.test.ts, scripts/test-all.sh]
    blocked_by: [Sync script (inject + --check)]
    satisfies: []
  - id: converge-files-document-the-workflow
    order: 4
    status: pending
    description: Run the sync to converge both surfaces and document the edit-core→sync flow in the recursive CLAUDE.md.
    files_touched: [CLAUDE.md]
    blocked_by: [Extract shared contract core, Sync script (inject + --check), Wire drift check into test-all]
    satisfies: []
---
# CLAUDE.md two-surface sync

## Goal

Eliminate drift between the two session-contract surfaces — the root recursive CLAUDE.md and the project-agnostic LOOM_CLAUDE_MD template in packages/app/src/installWorkspace.ts — by making the shared contract core a single source of truth, propagated by a sync script and enforced by a check wired into test-all. Today sync is by convention and the CLAUDE.md itself flags drift as its #1 risk; the recursive Loom session is the worst place to discover it. Vision/manual-step this removes: the manual, error-prone "remember to mirror the rule into both files" step every time the contract changes. Sequenced before mcp-new-tools step 6 on purpose — that step's manual two-surface sync (for the new tools) is the first thing the new enforcement protects. Approach chosen: canonical-core file + injection markers + idempotent sync script with a --check mode (matches Rafa's "one source of truth in a file, with a build step or test that verifies"); the lighter marker-only drift-test and the heavier full-generation approaches are the alternatives.

---

## Steps

| Done | # | Step | Files touched | Blocked by | Satisfies |
|---|---|---|---|---|---|
| 🔳 | 1 | Extract the shared (project-agnostic) session-contract sections into one canonical file and bracket the injection point in both surfaces with markers. | CLAUDE.md, packages/app/src/installWorkspace.ts, scripts/claude-md/contract-core.md | — | — |
| 🔳 | 2 | Write scripts/sync-claude-md.ts that injects the canonical core between the markers in both surfaces; idempotent, with a --check mode. | scripts/sync-claude-md.ts | Extract shared contract core | — |
| 🔳 | 3 | Add a test that runs the sync in --check mode and fail test-all on drift. | tests/claude-md-sync.test.ts, scripts/test-all.sh | Sync script (inject + --check) | — |
| 🔳 | 4 | Run the sync to converge both surfaces and document the edit-core→sync flow in the recursive CLAUDE.md. | CLAUDE.md | Extract shared contract core, Sync script (inject + --check), Wire drift check into test-all | — |
---

### Legend

| Symbol | Meaning |
|--------|---------|
| ✅ | Done |
| 🔄 | In Progress |
| 🔳 | Pending |
| ❌ | Cancelled |

### Step 1 — Extract shared contract core

Identify the rules shared by both surfaces (MCP visibility, chat-reply rules, stop rules, session-start protocol, MCP-tools-for-all-writes, etc.) vs the root-only project specifics (packages/ paths, active work, vision-reference path, recursive two-surface section). Move the shared core verbatim into scripts/claude-md/contract-core.md. In BOTH the root CLAUDE.md and the LOOM_CLAUDE_MD template literal, wrap the region the core occupies with <!-- LOOM-CONTRACT:start --> / <!-- LOOM-CONTRACT:end --> markers; project-specific text stays outside the markers. No behavior change yet — just establish the seams.

### Step 2 — Sync script (inject + --check)

Reads scripts/claude-md/contract-core.md and replaces the text between the LOOM-CONTRACT markers in (a) the root CLAUDE.md and (b) the LOOM_CLAUDE_MD string literal inside installWorkspace.ts. The template is a TS template literal, so the in-literal markers are part of the string — replace between them with the core text correctly escaped for the literal (backticks/${} ). Default run rewrites both files to match the core; --check rewrites nothing, exits non-zero and prints a diff if either surface is out of sync. Main complexity is the TS-literal injection — keep it a single well-tested regex between the marker comments.

### Step 3 — Wire drift check into test-all

A test (or a direct script invocation) that runs `sync-claude-md --check` and asserts exit 0. Add it to scripts/test-all.sh so drift fails the suite — moving discovery out of live sessions and into test-all, per the stated goal.

### Step 4 — Converge files + document the workflow

Run sync-claude-md so both surfaces match the canonical core (commit the now-identical shared regions). Rewrite the 'Two CLAUDE.md surfaces' section of the root CLAUDE.md to describe the new contract: edit scripts/claude-md/contract-core.md for shared rules, run the sync script, and test-all enforces no drift. Note that root-only project specifics still live outside the markers.
