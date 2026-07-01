---
type: idea
id: id_01KWFV8SFG5EC7RYZARGHCYAQY
title: Run migrate-layout — flatten to canonical filenames
status: done
created: 2026-07-01
version: 1
tags: []
parent_id: null
requires_load: []
---
# Run migrate-layout — flatten to canonical filenames

## What

Execute `loom migrate-layout` on a Loom repo to rename every doc to the canonical flat scheme introduced by the entities-crud work:

- `{thread}-idea.md` → `idea.md`, `{thread}-design.md` → `design.md`
- `{thread}-plan-NNN.md` → `plan-NNN.md`, done docs → `plan-NNN-done.md`
- `{thread}-chat-NNN.md` / `{thread}.md` → `chat-NNN.md`
- `loom/refs/*` unchanged

Rename-only (zero content rewrites), idempotent, collision-safe.

## Why

Step 1 of the entities-crud thread shipped **dual-read** (transition strategy A): writers emit the new names, readers accept old *and* new. This command normalises existing docs onto the new names so the dual-read scaffolding can eventually be removed — see the `clean-legacy-read` thread.

## Portable runbook (self-instructions for future-me)

This thread is a runbook for **future-me to execute in a FRESH session**, and it is **repo-agnostic** — `loom migrate-layout` is a `loom` CLI command available in any installed repo. Rafa will copy this thread into Chord Flow and ping me to run it there too.

Two hard rules:

1. **Fresh session only.** The migration renames this thread's own plan + chat files mid-run (expected — it's a nice self-test that the migration handles live docs). Don't run it while stepping this plan from its files.
2. **Verify thoroughly.** There are many documents; the whole point is to prove nothing was lost or corrupted.

## Success criteria

- All docs on the new canonical names; `loom/refs` untouched.
- `git diff` shows **only renames, zero content deltas**.
- The count of `.md` files under `loom/` is **unchanged** (nothing lost or duplicated).
- `loom validate` is **clean** (the ULID cross-reference graph survived — this is the real safety net).
- `./scripts/test-all.sh` green (where the repo has it).