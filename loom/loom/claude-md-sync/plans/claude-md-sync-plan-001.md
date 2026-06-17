---
type: plan
id: pl_01KTTSTE25N3CD8A1KT2KJ3KC1
title: CLAUDE.md two-surface sync
status: done
created: 2026-06-11
updated: 2026-06-11
version: 1
design_version: 1
tags: []
parent_id: null
requires_load: []
target_version: 0.1.0
actual_release: 1.4.0
steps:
  - id: tag-shared-rules-with-stable-ids
    order: 1
    status: done
    description: "Tag every shared session-contract rule with a stable <!-- rule:{id} --> marker in BOTH surfaces; no wording changes, just tag."
    files_touched: [CLAUDE.md, packages/app/src/installWorkspace.ts]
    blocked_by: []
    satisfies: []
  - id: build-the-two-surface-drift-test
    order: 2
    status: done
    description: "Write tests/claude-md-sync.test.ts: assert the rule-id SET matches across both surfaces, plus verbatim-invariant string locks."
    files_touched: [tests/claude-md-sync.test.ts]
    blocked_by: [Tag shared rules with stable ids in both surfaces]
    satisfies: []
  - id: wire-the-drift-test-into-test
    order: 3
    status: done
    description: Add the drift test to scripts/test-all.sh so a rule-set or invariant mismatch fails the suite.
    files_touched: [scripts/test-all.sh]
    blocked_by: [Build the two-surface drift test]
    satisfies: []
  - id: document-the-rule-id-invariant-convention
    order: 4
    status: done
    description: Rewrite the root CLAUDE.md 'Two CLAUDE.md surfaces' section to document the rule-id markers, the invariant list, and that test-all enforces parity.
    files_touched: [CLAUDE.md]
    blocked_by: [Tag shared rules with stable ids in both surfaces, Build the two-surface drift test, Wire the drift test into test-all]
    satisfies: []
---
# CLAUDE.md two-surface sync

## Goal

Eliminate drift between the two session-contract surfaces — the root recursive CLAUDE.md and the project-agnostic LOOM_CLAUDE_MD template in packages/app/src/installWorkspace.ts — WITHOUT flattening their deliberately different per-surface wording. The two are adapted paraphrases (persona Rafa vs "the user", gate-installed vs if-installed, session-start step numbering, condensation, root-only sections), so there is no verbatim shared core to single-source; the templated single-source approach (option 1) was rejected because its payoff collapses when the surfaces must read differently by purpose. Instead, enforce parity at the rule-SET level: tag every shared rule with a stable id in both surfaces and have test-all assert the id sets match, plus a short list of verbatim-invariant strings (visibility prefixes, tool names, stop-rule count) that must appear identically in both. This catches the real failure mode — a rule added/changed in one surface and forgotten in the other — and moves discovery from live sessions into test-all, while each surface keeps its tailored voice. Vision/manual-step removed: the manual "remember to mirror the rule into both files" step. Sequenced before mcp-new-tools step 6, whose manual two-surface sync (for the new tools) is the first thing this protects.

---

## Steps

| Done | # | Step | Files touched | Blocked by | Satisfies |
|---|---|---|---|---|---|
| ✅ | 1 | Tag every shared session-contract rule with a stable <!-- rule:{id} --> marker in BOTH surfaces; no wording changes, just tag. | CLAUDE.md, packages/app/src/installWorkspace.ts | — | — |
| ✅ | 2 | Write tests/claude-md-sync.test.ts: assert the rule-id SET matches across both surfaces, plus verbatim-invariant string locks. | tests/claude-md-sync.test.ts | Tag shared rules with stable ids in both surfaces | — |
| ✅ | 3 | Add the drift test to scripts/test-all.sh so a rule-set or invariant mismatch fails the suite. | scripts/test-all.sh | Build the two-surface drift test | — |
| ✅ | 4 | Rewrite the root CLAUDE.md 'Two CLAUDE.md surfaces' section to document the rule-id markers, the invariant list, and that test-all enforces parity. | CLAUDE.md | Tag shared rules with stable ids in both surfaces, Build the two-surface drift test, Wire the drift test into test-all | — |
---

### Legend

| Symbol | Meaning |
|--------|---------|
| ✅ | Done |
| 🔄 | In Progress |
| 🔳 | Pending |
| ❌ | Cancelled |

<!-- step:tag-shared-rules-with-stable-ids -->
### Step 1 — Tag shared rules with stable ids in both surfaces

Define the rule-id vocabulary for the rules that genuinely exist in both surfaces (e.g. chat-reply, mcp-writes-gate, mcp-visibility, context-injection, stop-rules, session-start, single-ai, plans-structured, sampling-blocked, catalog-first, mcp-failures-are-findings). Insert a `<!-- rule:{id} -->` comment immediately before each such rule/section in the root CLAUDE.md AND inside the LOOM_CLAUDE_MD template literal in installWorkspace.ts. Root-only sections (Architecture, Current active work, Build/test, Applied learning, Two-surfaces) get no marker. This only adds comments — zero behavior/wording change — establishing the parity seam.

<!-- step:build-the-two-surface-drift-test -->
### Step 2 — Build the two-surface drift test

Extract the set of `<!-- rule:id -->` markers from (a) the root CLAUDE.md and (b) the LOOM_CLAUDE_MD literal (read installWorkspace.ts source as text). Assert the two id sets are equal; on mismatch, fail with a clear message naming which ids are missing on which side (this is the 'added a rule to one, forgot the other' guard). Then assert a small VERBATIM-INVARIANT list appears identically in both surfaces: the visibility prefixes (`🔧 MCP:`, `📡 MCP:`, `⚠️ MCP unavailable — editing file directly`), the core tool names, and the stop-rule count. Wording within a rule is intentionally NOT compared — surfaces keep their purposeful voice.

<!-- step:wire-the-drift-test-into-test -->
### Step 3 — Wire the drift test into test-all

Invoke tests/claude-md-sync.test.ts from scripts/test-all.sh alongside the other suites, so drift fails test-all — moving discovery out of live recursive sessions, which is the stated goal.

<!-- step:document-the-rule-id-invariant-convention -->
### Step 4 — Document the rule-id + invariant convention

Replace the current prose-only 'keep them in sync' guidance with the concrete convention: shared rules carry `<!-- rule:id -->` markers in both surfaces; the verbatim-invariant list must match exactly; test-all asserts both. Note explicitly that per-surface wording is allowed to differ by purpose (Rafa vs the user, etc.) — only the rule SET and the invariants are locked.
