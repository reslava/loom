---
type: design
id: de_01KSTFZXP06VXHFDYG1FGAK1KT
title: Sidebar CONTEXT UX — see and toggle what the AI gets
status: done
created: 2026-05-29
updated: 2026-06-01
version: 4
idea_version: 3
tags: []
parent_id: id_01KSTFYVRPJF86BEYYNTT81C4N
requires_load: []
---
# Sidebar CONTEXT UX — see and toggle what the AI gets

Seeded with the open questions from `context-sidebar-idea`. **Decisions landed 2026-05-31** (chat-001) — see the decisions log at the bottom. The sections below keep the original deliberation; each now carries a **Decision** callout.

> **Key reframing (2026-05-31):** a CONTEXT panel *already exists* —
> `packages/vscode/src/providers/contextSidebarProvider.ts`. It is a registered,
> top-level, focus-following view (Pinned / Opt-in sections, per-doc + total token
> counts, ✓/○ toggles). But it **re-derives context locally** (its own pinned/opt-in
> heuristic, not the pipeline `ContextBundle`), its toggles are **ephemeral**
> (in-memory `loaded`, reset on focus change, never persisted), and its selection
> reaches launches as an **ephemeral `context_ids` prompt-arg** (`getSelectedIds()`
> → `buildPrompt` → `loom_do_step(context_ids=…)`). So this thread is **not "build a
> new surface"** — it is **rebase the existing panel onto the pipeline**: feed it from
> `loom://context/{target}?mode=`, render `BundledDoc.reason`, persist toggles to
> `.loom/context-prefs.json`, and collapse the two parallel context derivations into
> one so "what you see == what the AI gets" holds by construction.

---

## §1 — Where does CONTEXT render in the tree?

**Option A — Per-target child node.**
Each chat / plan / design in the tree gets an expandable `Context (N docs)` child. Click an entry to focus the source doc; right-click for include/exclude.
- Pros: scoped exactly to the thing you're about to act on; matches the "one bundle per launch" mental model; no global state confusion.
- Cons: deep nesting; user must expand the right node to see context; not visible when no doc is focused.

**Option B — Top-level CONTEXT section, follows focus.**
A persistent root-level section that retargets when the user clicks a chat/plan/design. Like the VS Code Outline view — always present, content changes with selection.
- Pros: always visible; one place to look; "what's loaded right now" is obvious.
- Cons: extra ambient state ("which target am I looking at?"); risk of staleness if focus tracking is wonky.

**Option C — Webview pane.**
Dedicated webview with richer interactions (drag-reorder, batch toggle, token-budget visualisation).
- Pros: room to grow into Phase 5 (budget UI); not constrained by TreeView API.
- Cons: heavier; harder to keep in sync with the rest of the tree; off-pattern for the rest of the Loom extension.

**Decision: B — and it already exists.** The deployed `ContextSidebarProvider` is
exactly Option B: a top-level view that retargets on `onSelectionChanged(node)`.
The earlier "Lean: Option A" was written without knowledge of that panel and is
**superseded**. We do not build a new surface; we rebase the existing one onto the
pipeline (see the reframing box above). The §1 "appear under every doc?" sub-question
is moot — a top-level focus-following view shows context for whatever node is
selected, and renders "Select a node to see context" when nothing valid is focused.

---

## §2 — Toggle visuals

The bundle already carries enough state to render distinct icons. Proposal:

| Symbol | Meaning | `BundledDoc.reason` |
|---|---|---|
| ✓ | auto-included | `auto` |
| 📌 | user-pinned (forced in by override) | `user-include` |
| 🚫 | user-excluded | (in `excluded[]`, `reason: 'user-exclude'`) |
| ⊘ | filtered by `load_when` but pulled in by `requires_load` | (in `excluded[]` cleanup path) — show source doc that required it |
| 🔒 | always-loaded (`load: always` + matching `load_when`) — can override but warns | `auto`, `type: reference`, `load: always` |
| ⚠ | stale | `stale: { reason }` on the bundled doc |
| ❌ | missing (`requires_load` target doesn't exist) | `missing: true` |

**Click behaviour:**
- Click ✓ → 🚫 (exclude)
- Click 🚫 → ✓ (un-exclude, back to auto)
- Click on an auto-excluded ref (filtered by `load_when`) → 📌 (force-include, overrides the filter)
- Click on 🔒 → confirm dialog ("Force-exclude X? It's marked `load: always`.") → 🚫

**Decision: adopt this symbol set.** Approved 2026-05-31. The existing panel only
has ✓ / ○ (loaded / unloaded); we replace that with the seven-symbol set above,
driven off `BundledDoc.reason` + the `stale` / `missing` fields. The "fourth state"
sub-question stays as designed: surface `load_when`-filter-cleared-by-include as 📌,
with the ⊘ provenance in the tooltip only.

---

## §3 — Shape of `.loom/context-prefs.json`

The pipeline takes `overrides: { include: string[]; exclude: string[] }` per call. The persistence file has to map from (target, mode) → overrides.

**Option A — Per-target, mode-agnostic.**
```json
{
  "ch_01ABC...": { "include": ["rf_vis"], "exclude": ["rf_old"] },
  "pl_01DEF...": { "include": [], "exclude": ["rf_chatty"] }
}
```
Simple. Reuses the same override list for every mode a target can launch in. Reasonable because most chats/plans have one natural launch mode.

**Option B — Per-target, per-mode.**
```json
{
  "ch_01ABC...": {
    "chat":   { "include": ["rf_vis"], "exclude": [] },
    "refine": { "include": [], "exclude": ["rf_old"] }
  }
}
```
More expressive. Most users would never hit the distinction; for the few that do (refine vs. chat on the same chat doc), it matters.

**Option C — Per-target with a `_default` plus per-mode overrides.**
```json
{
  "ch_01ABC...": {
    "_default": { "include": ["rf_vis"], "exclude": [] },
    "refine":   { "exclude": ["rf_old"] }
  }
}
```
Layered. Modes inherit `_default` and can add. Most general; most complex.

**Decision: A — mode-agnostic per-target.** `{ [targetId]: { include: string[], exclude: string[] } }`.
Confirmed 2026-05-31. Two-level is enough for the chat/do-step/refine cases today;
YAGNI on per-mode. Schema can grow to B/C without breaking by adding a discriminator
later. Global rules (`"_global"`) and per-mode both deferred until real friction.

---

## §4 — Persistence write path: MCP tool or extension-local?

**Option A — Extension writes directly to `.loom/context-prefs.json`.**
- Pros: simpler; the file is workspace-local; no round-trip; lower latency on toggle.
- Cons: only the VS Code extension can write prefs; a future CLI/agent can't manage them; the canonical write logic exists in two places if any other client needs it.

**Option B — MCP tool `loom_set_context_prefs`.**
- Pros: any agent can manage prefs (CLI, Claude Code, Cursor); single source of write truth; consistent with "all writes to `loom/`-relevant state go through MCP" though `.loom/` is config-shaped.
- Cons: extra round-trip for a single-click action; couples sidebar latency to MCP responsiveness.

**Option C — Hybrid: extension writes the file, MCP reads it.**
- Pros: best of both for latency.
- Cons: two-writer surface area (if MCP also gains a write path later, conflicts).

**Decision: B — MCP tool.** Confirmed 2026-05-31. Sub-100ms round-trip is invisible;
the consistency win and free CLI/agent access are worth it. `.loom/` config is exactly
what MCP should own.

**Concrete tool surface:**
- `loom_set_context_prefs(targetId, { include?, exclude?, reset? })` — merge into the target's entry; `reset: true` clears the entry.
- `loom_get_context_prefs(targetId)` — read-only; mostly for the sidebar to render.
- Read path is also already covered by `loom://context/{docId}?mode=...` returning the bundle with `excluded[]` populated; the sidebar reads from there primarily.

---

## §10 — Launch-path collapse (consequence of §4 + §6)

> New section, 2026-05-31. Surfaces an API consequence found during code recon.

Today the panel's selection reaches a launch as an **ephemeral prompt argument**:
`getSelectedIds()` (in-memory `loaded` ids) → `buildPrompt(…, contextIds)` →
`loom_do_step(planId, stepNumber, context_ids=[…])`. Two problems: the override is
lost on focus change (not durable), and it travels a *different* channel
(`context_ids` prompt arg) than the sidebar render path (local heuristic), so the
two can disagree.

**Decision: collapse to one path through persisted prefs.** Once toggles persist to
`.loom/context-prefs.json` (§4) and both `loom://context` *and* the
`loom_do_step` / refine briefs read that file as `overrides`, the panel no longer
needs to hold transient selection and the launch no longer needs to inject
`context_ids` from the panel. So:

- The ephemeral `getSelectedIds()` → `buildPrompt` `context_ids` arg channel is **removed**.
- `loom_do_step` (and the refine briefs) read `.loom/context-prefs.json` for the resolved target's overrides themselves — same file the sidebar edits and `loom://context` reads.
- One source of truth: edit prefs in the panel → every consumer (render + launch) sees the same overrides.

**Trade-off noted:** this makes every override *persist* (no "this launch only, don't
save" mode). That matches the idea's chosen mechanism (overrides live in
`context-prefs.json`); reset-to-auto is the undo. If a transient/per-launch-only mode
is wanted later, it is additive and out of scope here. *(Rafa: veto here if you want
to keep an ephemeral channel.)*

---

## §5 — Reconciliation rules

| User action | Auto state | Result | Surface as |
|---|---|---|---|
| Click exclude | ✓ auto | doc removed from bundle, added to `excluded[]` reason `user-exclude` | 🚫 |
| Click include | (not in auto, available in catalog) | doc added to bundle reason `user-include` | 📌 |
| Click include | ⊘ filtered by `load_when` | doc added, `load_when-filter` exclusion cleared (this already works in the assembler) | 📌 with tooltip |
| Click exclude | 🔒 `load: always` | warn (modal); on confirm, doc removed; surface as 🚫 with "overrides always" badge | 🚫 |
| `requires_load` from another doc | irrelevant to user toggle | always wins over `user-exclude`; surface as ⊘ "required by X" | ⊘ |

**Decision (§5 — `load: always` exclude UX): warn-on-confirm.** Confirmed 2026-05-31.
Excluding a 🔒 ref pops a confirm modal ("Force-exclude X? It's marked `load: always`.");
on confirm the doc is removed and surfaces as 🚫 with an "overrides always" badge.

**The hardest case** is the last row: a user excludes doc A, then doc B's `requires_load` pulls A back in. Today the assembler's final-cleanup makes A emitted but it appears once in `docs[]` (good) and the exclusion is cleared. The sidebar needs to show "you tried to exclude this, but B requires it". Tooltip text. Don't break the user's mental model — they should *see* their exclude is being overridden, not silently get the doc anyway.

---

## §6 — How the sidebar drives a re-render

The bundle is the source of truth. Every toggle must:

1. Write the prefs update (`loom_set_context_prefs` — §4).
2. Re-read `loom://context/{targetId}?mode={mode}` to get the new bundle.
3. Re-render the CONTEXT node from the new bundle.

**Decision: A — always re-run.** Confirmed 2026-05-31. The pipeline is a pure
traversal of in-memory `LoomState` (sub-ms on realistic state); no predictive/local
mutation. Note: the existing panel never runs the pipeline at all today, so adopting
A means wiring the toggle → persist → re-read `loom://context` loop from scratch.
Revisit only if a real workspace breaks the latency budget.

---

## §7 — Pre-launch visibility (when does the section update?)

The sidebar CONTEXT for a target should reflect what *would* load if the user clicked Reply / do-step / refine *right now*. So it must:

- Recompute on user toggle (§6).
- Recompute on focus change (target changed → re-read for new target). *(Existing panel already does this via `onSelectionChanged`.)*
- Recompute on `LoomState` mutation that affects this target's bundle (a new ref doc added, a `load_when` edited, a `requires_load` link added).

The third one is the tricky one — VS Code's file watcher fires for any `loom/**/*.md` change. Coarse-grained reaction (refresh on any change) is fine for v1; precise dirty-tracking is a Phase 5 nicety.

---

## §8 — Out-of-scope reaffirmed

- Token budgeting / summarisation UI — Phase 5; renders into the same surface later. *(Per-doc + total token counts already exist in the panel and stay.)*
- Multi-target session prefs (branch-wide overrides) — out of scope; revisit if requested.
- ctx-load itself — sibling thread.
- Non-VSCode clients of the same prefs file — the MCP path (§4 Option B) leaves the door open; no work in this thread.

---

## §9 — Plan-001 (decisions landed — rebase framing)

1. Add `loom_set_context_prefs` + `loom_get_context_prefs` MCP tools (read/write `.loom/context-prefs.json`, schema §3 Option A).
2. Wire `.loom/context-prefs.json` into the `loom://context` resource read path (and the `loom_do_step` / refine brief read path — §10) as `overrides`. Confirm the Phase-1 hook.
3. **Rebase the existing `ContextSidebarProvider` onto the bundle**: replace its local pinned/opt-in derivation with a read of `loom://context/{target}?mode=`, rendering one row per `BundledDoc` with the §2 symbol set. (Not "add a new child node" — the panel is already top-level B.)
4. Make toggles persist: include / exclude / reset call `loom_set_context_prefs`, then re-read `loom://context` and refresh (§6 always-re-run). Remove the ephemeral `getSelectedIds()` → `buildPrompt(context_ids)` channel (§10).
5. Render badge metadata (⚠ stale, ❌ missing) + the 🔒 warn-on-confirm dialog (§5) + the ⊘ "required by X" tooltip.
6. Smoke test: open a chat, exclude an auto-loaded ref via the toggle, click Reply, verify the `📄` line doesn't appear, prefs file shows the exclude, bundle `excluded[]` carries `reason: 'user-exclude'`.

---

## Decisions log

| # | Question | Decision | Date |
|---|---|---|---|
| §1 | Tree placement | **B** — top-level focus-following; panel already exists, rebase it onto the pipeline (A lean superseded) | 2026-05-31 |
| §2 | Toggle visuals | Adopt the 7-symbol set (✓ 📌 🚫 ⊘ 🔒 ⚠ ❌); replaces ✓/○ | 2026-05-31 |
| §3 | Prefs schema | **A** — mode-agnostic per-target `{ [id]: { include, exclude } }` | 2026-05-31 |
| §4 | Write path | **B** — MCP tool `loom_set_context_prefs` / `loom_get_context_prefs` | 2026-05-31 |
| §5 | `load: always` exclude UX | warn-on-confirm modal → 🚫 with "overrides always" badge | 2026-05-31 |
| §6 | Re-render strategy | **A** — always re-run the pipeline on toggle | 2026-05-31 |
| §10 | Launch-path | Collapse to persisted prefs; remove ephemeral `context_ids` prompt-arg channel | 2026-05-31 |
