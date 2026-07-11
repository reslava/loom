---
type: plan
id: pl_01KX9HE4G4BCTQV160YP025XNC
title: quick-fix-lane Plan
status: done
created: 2026-07-11
updated: 2026-07-11
version: 1
design_version: 1
tags: []
parent_id: null
requires_load: []
target_version: 0.1.0
actual_release: 1.23.0
steps:
  - id: added-and-slang-to-loom-slang
    order: 1
    status: done
    description: "Added `code quick` and `write quick` slang to loom-slang-reference.md (v1→v2): reframed the namespace into the `{act} quick` family, added vocabulary rows + explicit chains, a `code quick` vs `write quick` split section (axis = what verification the record is owed), a comma-chaining note, and stop-rule alignment."
    files_touched: []
    blocked_by: []
    satisfies: []
  - id: mirrored-the-two-new-words-into
    order: 2
    status: done
    description: "Mirrored the two new words into both CLAUDE.md surfaces under the `<!-- rule:loom-slang -->` marker — recursive CLAUDE.md with repo specifics, LOOM_CLAUDE_MD template kept project-agnostic — verified by build-all → claude-md-sync (17 rule ids, 12 invariant tokens) → full test-all (23/23)."
    files_touched: []
    blocked_by: []
    satisfies: []
  - id: settled-the-quick-fix-lane-idea
    order: 3
    status: done
    description: "Settled the quick-fix-lane idea's open decision: `do quick` is record-only (option A); `code quick`/`write quick` handle implement-then-record (source vs prose). Refreshed the example chain and success criteria."
    files_touched: []
    blocked_by: []
    satisfies: []
  - id: added-a-quick-fix-lane-recipe
    order: 4
    status: done
    description: Added a quick-fix-lane recipe section + the two new slang words to docs/WAYS-TO-USE-LOOM.md.
    files_touched: []
    blocked_by: []
    satisfies: []
---
# quick-fix-lane Plan

## Goal

Quick-ship record of 4 completed changes.

---

## Steps

| Done | # | Step | Files touched | Blocked by | Satisfies |
|---|---|---|---|---|---|
| ✅ | 1 | Added `code quick` and `write quick` slang to loom-slang-reference.md (v1→v2): reframed the namespace into the `{act} quick` family, added vocabulary rows + explicit chains, a `code quick` vs `write quick` split section (axis = what verification the record is owed), a comma-chaining note, and stop-rule alignment. | — | — | — |
| ✅ | 2 | Mirrored the two new words into both CLAUDE.md surfaces under the `<!-- rule:loom-slang -->` marker — recursive CLAUDE.md with repo specifics, LOOM_CLAUDE_MD template kept project-agnostic — verified by build-all → claude-md-sync (17 rule ids, 12 invariant tokens) → full test-all (23/23). | — | — | — |
| ✅ | 3 | Settled the quick-fix-lane idea's open decision: `do quick` is record-only (option A); `code quick`/`write quick` handle implement-then-record (source vs prose). Refreshed the example chain and success criteria. | — | — | — |
| ✅ | 4 | Added a quick-fix-lane recipe section + the two new slang words to docs/WAYS-TO-USE-LOOM.md. | — | — | — |
---

### Legend

| Symbol | Meaning |
|--------|---------|
| ✅ | Done |
| 🔄 | In Progress |
| 🔳 | Pending |
| ❌ | Cancelled |
