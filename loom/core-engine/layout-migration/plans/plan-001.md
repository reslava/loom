---
type: plan
id: pl_01KWFV9Q23TPHFTAG1FM0AQFPR
title: Run migrate-layout — flatten to canonical filenames
status: done
created: 2026-07-01
updated: 2026-07-01
version: 1
design_version: 1
tags: []
parent_id: id_01KWFV8SFG5EC7RYZARGHCYAQY
requires_load: []
target_version: 0.1.0
steps:
  - id: precondition-clean-tree-fresh-session-current
    order: 1
    status: done
    description: "Confirm a FRESH session and a clean tree: git status shows nothing uncommitted (this plan + chat WILL be renamed by the migration, so nothing should hold them open). Confirm the loom CLI is the current build (loom --version; if unsure, ./scripts/build-all.sh). Record the pre-migration count of .md files under loom/ for the later invariant check."
    files_touched: []
    blocked_by: []
    satisfies: []
  - id: dry-run-and-review-the-rename
    order: 2
    status: done
    description: "Run `loom migrate-layout --dry-run` (moves nothing). Review the planned renames: spot-check the patterns (idea/design flatten, plan-NNN, plan-NNN-done, chat-NNN), confirm loom/refs is NOT in the list, and note the total rename count. Abort and report if anything looks off (unexpected targets, collisions)."
    files_touched: []
    blocked_by: []
    satisfies: []
  - id: execute-the-migration
    order: 3
    status: done
    description: Run `loom migrate-layout`. It renames all docs to the canonical scheme (rename-only, idempotent, collision-safe).
    files_touched: []
    blocked_by: []
    satisfies: []
  - id: verify-rigorously-no-loss-no-content
    order: 4
    status: done
    description: "The important step. Assert ALL of: (a) git diff --stat shows ONLY renames — no content hunks (grep the diff for non-rename changes → none); (b) the count of .md under loom/ equals the pre-migration count (nothing lost or duplicated); (c) `loom validate` is clean — no broken parent_id, no dangling child_ids, no missing steps tables (proves the ULID cross-reference graph survived the rename); (d) ./scripts/test-all.sh green (where present); (e) `loom status` / reading loom://state loads without errors. Report each check's result explicitly."
    files_touched: []
    blocked_by: []
    satisfies: []
  - id: commit
    order: 5
    status: done
    description: "Stage everything and commit: `chore: migrate-layout — flatten to canonical filenames`. Report the rename count and confirm every verification check in step 4 passed. (On Chord Flow: same steps; if that repo has no test-all script, rely on loom validate + loom status.)"
    files_touched: []
    blocked_by: []
    satisfies: []
---
# Run migrate-layout — flatten to canonical filenames

## Goal

Run `loom migrate-layout` on this repo to flatten every doc filename to the canonical scheme (idea.md / design.md / plan-NNN.md / plan-NNN-done.md / chat-NNN.md; loom/refs untouched), then verify rigorously that the mass rename lost or corrupted nothing. Repo-agnostic runbook — reused verbatim on Chord Flow. MUST run in a fresh session, because the migration renames this very plan + chat mid-run. Steps are sequential; execute top to bottom.

---

## Steps

| Done | # | Step | Files touched | Blocked by | Satisfies |
|---|---|---|---|---|---|
| ✅ | 1 | Confirm a FRESH session and a clean tree: git status shows nothing uncommitted (this plan + chat WILL be renamed by the migration, so nothing should hold them open). Confirm the loom CLI is the current build (loom --version; if unsure, ./scripts/build-all.sh). Record the pre-migration count of .md files under loom/ for the later invariant check. | — | — | — |
| ✅ | 2 | Run `loom migrate-layout --dry-run` (moves nothing). Review the planned renames: spot-check the patterns (idea/design flatten, plan-NNN, plan-NNN-done, chat-NNN), confirm loom/refs is NOT in the list, and note the total rename count. Abort and report if anything looks off (unexpected targets, collisions). | — | — | — |
| ✅ | 3 | Run `loom migrate-layout`. It renames all docs to the canonical scheme (rename-only, idempotent, collision-safe). | — | — | — |
| ✅ | 4 | The important step. Assert ALL of: (a) git diff --stat shows ONLY renames — no content hunks (grep the diff for non-rename changes → none); (b) the count of .md under loom/ equals the pre-migration count (nothing lost or duplicated); (c) `loom validate` is clean — no broken parent_id, no dangling child_ids, no missing steps tables (proves the ULID cross-reference graph survived the rename); (d) ./scripts/test-all.sh green (where present); (e) `loom status` / reading loom://state loads without errors. Report each check's result explicitly. | — | — | — |
| ✅ | 5 | Stage everything and commit: `chore: migrate-layout — flatten to canonical filenames`. Report the rename count and confirm every verification check in step 4 passed. (On Chord Flow: same steps; if that repo has no test-all script, rely on loom validate + loom status.) | — | — | — |
---

### Legend

| Symbol | Meaning |
|--------|---------|
| ✅ | Done |
| 🔄 | In Progress |
| 🔳 | Pending |
| ❌ | Cancelled |
