---
type: design
id: de_01KTTM79FTN3R728DZGTXZCSJE
title: MCP friction-reduction tools
status: done
created: 2026-06-11
updated: 2026-06-11
version: 5
idea_version: 2
tags: []
parent_id: id_01KTTM64G1B2XZMDS739CDABYF
requires_load: []
---
# MCP friction-reduction tools

## Overview

Three independent deliverables, ordered by leverage/cost. All are new MCP tools in `packages/mcp` backed by app use-cases in `packages/app`, following the `cli/mcp → app → core + fs` dependency rule. No reducer touches IO; all writes go through the existing `runEvent` / repository write path so the link index and frontmatter validation run identically to `loom_update_doc`.

---

## 1. `loom_patch_doc` — body-prose string-match edit

### Tool shape
```
loom_patch_doc(id, old_string, new_string, replace_all?)
```
Returns the updated doc id + filePath, same envelope as `loom_update_doc`.

### Behavior
- Loads the doc, splits frontmatter from body (reuse the existing frontmatter parser in `packages/fs`).
- Operates on the **body string only**. `old_string` must match exactly once (unless `replace_all`), mirroring the native Edit tool's contract — unique-match-or-error keeps it safe.
- Re-serializes via `serializeFrontmatter` + body, writes through the same path `loom_update_doc` uses (re-parse, re-index, version handling identical to a body edit).

### Guards (the whole safety story)
1. **Frontmatter is off-limits.** The tool never receives or touches the frontmatter block; matching is scoped to the body substring only. An `old_string` that doesn't exist in the body simply fails to match — it cannot reach into frontmatter.
2. **Steps table is off-limits.** For `type: plan` docs, the `## Steps` table is generated from frontmatter. The tool refuses if the match range intersects the generated Steps block (detect the block by its heading + table fence and reject overlap). Step edits go through tool #2, never here. **(Resolved: reject only on Steps-block intersection — plan bodies otherwise remain patchable, e.g. the `## Goal` prose. We do NOT forbid all plan-body patches; that would be over-restrictive.)**
3. **No state mutation.** This is a prose edit — same version-bump semantics as a body `loom_update_doc`, no status/parent changes.

### Why string-match, not line ranges
Line numbers shift and the agent doesn't reliably know them without re-reading the whole doc — which defeats the token saving and adds a brittle failure mode. String-match is the agent's native strength and is self-validating (unique match).

---

## 2. `loom_update_step` + `loom_reorder_steps` — pending-only step editing

Steps are YAML frontmatter (source of truth); the body table is a generated view. Both tools mutate the frontmatter steps array via a pure reducer, then regenerate the body table.

### `loom_update_step(planId, stepId, patch)`
- `patch`: any of `{ description?, files?, satisfies?, blockedBy? }`. (Refined during implementation: `title`/`detail` are body-owned prose, not frontmatter — and are not even read back into the step model — so they are edited via `loom_patch_doc` on the `### Step N` sections, never through `update_step`. This keeps frontmatter and body from drifting.)
- Reducer finds the step by `id`, applies the patch, returns new state. Body Steps table regenerated after.

### `loom_reorder_steps(planId, orderedStepIds)`
- `orderedStepIds`: full ordered list of the plan's step ids.
- Validates it's a permutation of existing ids (no adds/drops here — that's a separate concern if ever needed).
- Reorders the frontmatter array. `blockedBy` references ids, which stay glued to their steps, so blockers survive reordering. Body table regenerated.

### Immutability guard (done steps)
Both tools **reject** if the target step (for `update_step`) or any reordered position would move/edit a step whose status is done/✅. Rationale: event-sourcing — a done step is history, its `done.md` cites it; corrections go forward, not by mutating the past. The reducer enforces this; the tool surfaces a clear "done steps are immutable" error.

- `update_step` on a done step → reject.
- `reorder_steps`: **done steps keep their leading positions (Resolved).** Reordering *among* pending steps is fine; any proposed order that does not preserve the done steps as a contiguous leading block, in their original relative order, → reject.

### Scope discipline
These are **surgical** primitives — fix a citation, rename a step, reorder pending work. They are **not** the path for substantive plan redesign (that's refine/regenerate, per "fix the generator, not the artifact"). Documented as such in the tool description.

---

## 3. Chat token optimization — read-cursor + tail-read

### Goal
Make replying inside a chat the path of least resistance (incentive, not enforcement). Today the cost is re-reading the whole chat on first touch; the fix is incremental reads.

### Frontmatter read-cursor
Add an optional field to chat frontmatter recording the position consumed by the last AI reply — **the index of the last AI block (Resolved)**, not a byte/line offset (robust to reflow).

**The AI header string is configurable, not hardcoded.** Block detection must key on the configured `ai.model` value from `.loom/settings.json` (e.g. `"AI:"` → headers like `## AI:`), with `user.name` as the complementary human header. Never hardcode `## AI:`; read the configured strings so the cursor works in any workspace whose headers were customized. The append path already knows these strings (it writes the headers), so the cursor reuses the same source.

### `loom_read_chat_tail(id)`
- Returns only the content **after** the last AI block (the new human turns since the AI last replied) instead of the whole doc.
- Used on the *first* touch of a chat in a conversation, replacing the full re-read.

### `loom_append_to_chat` auto-advances the cursor
After appending an AI reply, update the cursor (new last-AI-block index) so the next `read_chat_tail` starts from the right place. No manual cursor management by the agent.

### Net effect
First reply reads a small tail, not 200 lines; subsequent replies in the same conversation already have context in transcript (existing rule). The durable path becomes cheap → the terminal-drift incentive weakens without any hook.

---

## Rejected alternatives

- **Stop-hook to force chat replies.** Rejected. The edit-gate hook has been disabled this whole time and doc-writes-via-MCP still happen reliably under rules alone → hook enforcement is proven unnecessary where it'd be easy, and hardest where it'd help (chat replies need stateless detection of "is a chat active," which lives in the AI, not a stateless hook). Not portable (`.ps1`), and with one user the cross-platform hook-install pipeline buys nothing. Vision says the durable path should be least-resistance, not disciplined — so #3 (make it cheap) is the right lever, not a hook (make it mandatory).
- **Line-level patch (#1).** Rejected — brittle, requires re-reading for line numbers, no self-validation.
- **Single overloaded step tool.** Rejected — edit and reorder have different validation and integrity constraints; keep them separate.
- **Forbidding all plan-body patches (#1 guard).** Rejected — over-restrictive; only the generated Steps block needs protection.

## Resolved decisions

1. **Read-cursor representation** → index of the last AI block, with block detection keyed on the configured `ai.model` / `user.name` header strings from `.loom/settings.json` (never hardcode `## AI:`).
2. **`patch_doc` on plan bodies** → reject only matches that intersect the generated Steps block; the rest of a plan body stays patchable.
3. **`reorder_steps` done rule** → done steps keep their leading positions (contiguous leading block, original relative order); any order violating that is rejected.

## Build / test

Standard: app use-case + pure reducer in `packages/core`/`app`, MCP tool wrapper in `packages/mcp`, then `./scripts/build-all.sh` (relinks global CLI so live MCP picks up new tool args) and MCP integration tests. Remember the running session's `loom mcp` is stale until restart.