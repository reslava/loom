---
type: chat
id: ch_01KWFVJ9CW7VMJ38HEH09M3B7P
title: layout-migration Chat
status: done
created: 2026-07-01
version: 1
tags: []
parent_id: null
requires_load: []
last_ai_block: 5
---
# layout-migration Chat

## Rafa:

load context
read idea
I started the plan
if all is clear and grounded do whole plan

## AI:

**Aborted at step 2 — the dry-run reveals filename collisions. No files were moved; tree is still clean.**

Context + idea + plan loaded. Ran steps 1–2:

- **Step 1 ✅** Fresh session, clean tree (`git status --porcelain` empty), `loom` v1.12.0 with `migrate-layout` present. Pre-migration baseline: **582** `.md` files under `loom/`.
- **Step 2 ⛔** `loom migrate-layout --dry-run` would rename **395** files (`loom/refs` correctly excluded, 0 mentions). But **6 targets are collision points** — 17 distinct source docs collapse onto 6 canonical names, so **11 files would be overwritten/lost**:

| Thread / folder | # sources | Collapse to |
|---|---|---|
| `ai-integration/ai-integration/plans` | 2 (`ai-chat-`, `ai-promote-`) | `plan-001.md` |
| `core-engine/app-layer-refactor/done` | 3 (`app-layer-refactor-`, `cli-delegate-directory-creation-`, `loom-management-app-extraction-`) | `plan-001-done.md` |
| `core-engine/body-generators/done` | 5 (`body-generators-`, `path-utils-`, `plan-table-utils-`, `refactor-imports-`, `validation-utils-`) | `plan-001-done.md` |
| `core-engine/core-engine/plans` | 3 (`core-engine-`, `core-tests-`, `move-thread-to-entities-`) | `plan-001.md` |
| `core-engine/loom-state-entity/plans` | 2 (`loom-state-entity-`, `state-filters-`) | `plan-001.md` |
| `vscode-extension/vscode-extension/done` | 2 (`linkRepository-fix-`, `vscode-tests-`) | `plan-001-done.md` |

### Root cause

Old naming was `{descriptive-slug}-plan-{NNN}.md`, where the ordinal `NNN` restarted at `001` **per plan-slug**, not per thread. `migrate-layout` flattens by stripping the prefix down to the trailing ordinal (`→ plan-001.md`). That's only unique when a thread has exactly one plan. These threads each hold **multiple plans that all carry ordinal `001`**, so they map onto the same target. Same story for the multi-plan `done/` folders.

The command's "rename-only, collision-safe" contract does **not** hold on this repo — it doesn't renumber colliding plans, it silently maps them onto one name.

### Why I stopped rather than worked around it

This is a defect in `migrate-layout` itself (the generator), not in the docs. Hand-renaming the 11 files to dodge the collision would hide the bug — and this whole thread exists to *prove the migration is safe* before we reuse it verbatim on Chord Flow. If it collides here, it'll collide there.

### Fix options (need your call — stop-rule #3, migration algorithm design)

1. **Renumber per-thread on collision (recommended).** When >1 plan resolves to the same ordinal in a thread, assign `plan-001`, `plan-002`, … in a stable order (e.g. `created`, then id), and carry each plan's `done` doc to the matching `plan-NNN-done.md`. This is the correct canonical behavior — one contiguous ordinal sequence per thread — and makes the command genuinely collision-safe. Requires a change in the `migrate-layout` rename logic + a regression test with a multi-plan thread, then re-dry-run.
2. **Fail-fast on collision.** Make `migrate-layout` detect duplicate targets and abort with a report instead of silently colliding — turns the current silent hazard into a guarded error. Weaker: it protects data but still leaves these threads un-migratable until (1) exists.
3. Something else you have in mind.

I'd go with **(1)** — it's the only option that actually finishes the migration correctly and keeps the runbook reusable on Chord Flow. Want me to switch to the `migrate-layout` source (`packages/…`) and implement the per-thread renumber + test, then re-run the dry-run here?

**STOP — waiting for go.**

## Rafa:

(1) also generate a kind of "log" with collisions and renames done
go

## AI:

Fixed `migrate-layout` (option 1 + audit log). Verified, **not yet committed, migration not yet run** — checkpoint below.

### What changed (all in `packages/`, not `loom/**`)

- **`packages/app/src/migrateLayout.ts`** — collision-aware per-thread renumber. New `assignOrdinals()` runs three phases: (0) done docs that mirror a live parent plan claim that plan's new ordinal as a **hard** lock; (1) plans/dones whose ordinal is **unique** keep it — so distinct ordinals *and* existing gaps are preserved (minimal churn); (2) only the colliding extras get the smallest free ordinal, in stable `(ordinal, created, id)` order. Every ≥2-way contest is captured in a new `collisions` field.
- **`packages/cli/src/commands/migrateLayout.ts`** — prints a collision summary and writes a full audit log (collisions + all 395 renames + skips) to **`.loom/cache/migrate-layout.log`** (gitignored in every Loom install → repo-agnostic, and never pollutes the "renames-only" diff).
- **`tests/migrate-layout.test.ts`** — new test 4: a thread with two `@001` plans + a distinct `@002`, plus a mirror-done vs a dead-parent legacy done. Asserts nothing collapses, ids survive, the mirror keeps its plan's ordinal, collisions are reported, and it's idempotent.

### Verification

- `migrate-layout.test.ts` — **4/4 pass** (incl. the new collision case).
- `./scripts/test-all.sh` — **green**.
- Real-repo dry-run: **395 renames, all targets now unique (0 collisions)**. The 6 former collision groups auto-renumber cleanly, e.g.
  - `core-engine/plans`: 3 plans `@1` → `plan-001 / 004 / 005` — the distinct `002`/`003` are **preserved**, only the extras moved.
  - `body-generators/done`: 5 dones `@1` → `plan-001…005-done`.

### Why I'm stopping here

The command fix is a new deliverable, and the next actions are consequential/irreversible: (a) commit the tool fix as its **own** commit (must land before the migration so step-4's "renames-only" diff stays pure), then (b) run the real `migrate-layout` (395 renames), verify per plan step 4, and commit the renames (step 5). Two separate commits, one big mass-rename.

**Ready to proceed on go.** On `go` I'll: commit the fix → run the migration → run the full step-4 verification (only-renames diff, 582 `.md` count holds, `loom validate` clean, test-all green, `loom status` loads) → commit the renames.

(And yeah — replying through a doc mid-task is clunky; noting that as a real dogfooding friction point.)

**STOP — waiting for go.**

## AI:

Migration complete — all 5 plan steps done, both commits landed.

**Two commits:**
1. `fix:` migrate-layout collision-aware per-thread renumber + audit log (packages/app, packages/cli, tests, + this chat).
2. `chore:` migrate-layout — flatten to canonical filenames — **395 files changed, 0 insertions / 0 deletions**, every rename 100% similarity.

**Step 4 verification (all explicit results):**
- **(a) renames only** — 395 renames, zero content hunks. ✓
- **(b) count invariant** — 582 `.md` under `loom/` before and after. ✓
- **(c) ULID graph intact** — no broken `parent_id`, no dangling `child_id`, no missing Steps table, no file-not-found. `loom validate` total is **201 both pre- and post-migration** — all pre-existing legacy noise (187 `blockedBy`-prose + ~10 stale plans, owned by `plan-blockedby-id-normalization`). The migration introduced **zero net new issues**; two already-broken legacy blockers (`vscode-extension-plan-008`, `vscode-tests-plan-001`) just changed error category from `unknown blocker format` → `blocked by missing plan` because their target files were renamed. Not new breakage. ✓
- **(d) test-all** — green. ✓
- **(e) loom status / state** — load clean. ✓

**Collisions auto-renumbered (6 groups, nothing overwritten):**
- `ai-integration/ai-integration/plans`: 2 → plan-001/002
- `core-engine/core-engine/plans`: 3 @1 → plan-001/004/005 (distinct 002/003 preserved)
- `core-engine/loom-state-entity/plans`: 2 → plan-001/002
- `core-engine/app-layer-refactor/done`: 3 → plan-001..003-done
- `core-engine/body-generators/done`: 5 → plan-001..005-done
- `vscode-extension/vscode-extension/done`: 2 → plan-001/002-done

3 docs skipped (legacy names with no parseable ordinal + dead parents — left untouched, nothing lost): the two `mvp-plan-to-publish-*` docs and `app-use-cases-completion-plan.md`.

**Runbook note for Chord Flow:** the command is now collision-safe for real — same steps apply. Watch for the same auto-renumber on any thread that historically had multiple `{slug}-plan-001` docs; the audit log at `.loom/cache/migrate-layout.log` records exactly what moved.

**One open item:** this plan is still `implementing` with 5 pending steps — functionally all done. Want me to formally mark the 5 steps ✅ and close the plan (a few `loom_complete_step` calls + `loom_close_plan`, one small follow-up commit)? Left it untouched since your last instruction was scoped to committing the renames.

Next: waiting on whether to close out the plan.

## AI:

## Thread summary — layout-migration (closed)

**Outcome:** the whole repo is on the canonical flat filename scheme, and the `migrate-layout` command that got us there is now genuinely collision-safe (reusable verbatim on Chord Flow).

**The detour that mattered:** the plan assumed a safe one-shot run, but step 2's dry-run caught 6 collision groups — legacy threads holding multiple `{slug}-plan-001` docs that would have collapsed onto one canonical name (17 docs → 6 targets; a hard `fs.move` error mid-run leaving a half-migrated tree). So step 3 became "fix the command first": a collision-aware per-thread renumber (distinct ordinals + gaps preserved, only colliding extras bumped; done docs mirror their parent plan's new ordinal), plus an audit log at `.loom/cache/migrate-layout.log`. Fixing the generator instead of hand-renaming around it kept the runbook honest.

**Shipped (3 code + 3 loom commits):**
- `fix:` collision-aware renumber + audit log (`packages/app`, `packages/cli`, regression test).
- `chore:` migrate-layout run — **395 renames, 0 insertions / 0 deletions**.
- close-out: idea done, this chat, plan steps ✅.

**Verification (step 4, all green):** renames-only diff · 582 `.md` count held · ULID graph intact (no broken parent/child/steps-table; `loom validate` total unchanged at 201 pre-existing legacy items) · `test-all` green · `loom status` clean.

**Carried forward:** two already-broken legacy blockers changed error category (`unknown blocker format` → `blocked by missing plan`) as their targets were renamed — noise owned by `plan-blockedby-id-normalization`. And the `clean-legacy-read` thread can now proceed to drop the dual-read scaffolding, since every doc is on the new names.

Plan status: **done**. 🧵