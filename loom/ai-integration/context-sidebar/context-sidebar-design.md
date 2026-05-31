---
type: design
id: de_01KSTFZXP06VXHFDYG1FGAK1KT
title: Sidebar CONTEXT UX — see and toggle what the AI gets
status: draft
created: "2026-05-29T00:00:00.000Z"
updated: 2026-05-29
version: 2
tags: []
parent_id: id_01KSTFYVRPJF86BEYYNTT81C4N
requires_load: []
---
# Sidebar CONTEXT UX — see and toggle what the AI gets

Seeded with the open questions from `context-sidebar-idea`. Decisions land here before plan-001.

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

**Lean:** Option A. Per-target nesting matches the bundle model 1:1 (one bundle per target × mode). Top-level (B) saves a click but adds ambient state and the "wait, what's it showing right now?" problem. Webview (C) is over-engineered for what's effectively a list of checkboxes.

**Open question:** if Option A, does the Context node appear under *every* doc, or only under docs that are valid launch targets (chats, plans, designs)? My lean: only valid targets — otherwise the tree is full of empty CONTEXT nodes.

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

**Open question:** do we need a fourth state for "user-included over auto-exclude" (i.e. the `load_when-filter` cleared by include)? The bundle already collapses this into `user-include` reason + an empty excluded entry. My lean: surface it as ⊘ in tooltip only — the symbol is still 📌.

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

**Lean:** Option A for v1. Two-level (target → overrides) is enough for the chat/do-step/refine cases we have today; YAGNI on per-mode until real friction shows up. Schema can grow to B/C without breaking — add a discriminator (e.g. presence of `_default`) later if needed.

**Open question:** global rules ("never auto-load `rf_chatty` anywhere in this workspace"). Useful escape hatch for a doc that consistently bloats every bundle. Could live as a top-level `"_global": { "exclude": [...] }` key. My lean: skip for v1, add when someone asks twice.

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

**Lean:** Option B. The extra round-trip on a click is invisible (sub-100ms typical); the consistency win is real. Drop the "MCP is for `loom/**`, not `.loom/**`" objection — `loom_set_context_prefs` is reading/writing structured workspace config, exactly what MCP is meant for. CLI/agent access for free is the kicker.

**Concrete tool surface:**
- `loom_set_context_prefs(targetId, { include?, exclude?, reset? })` — merge into the target's entry; `reset: true` clears the entry.
- `loom_get_context_prefs(targetId)` — read-only; mostly for the sidebar to render.
- Read path is also already covered by `loom://context/{docId}?mode=...` returning the bundle with `excluded[]` populated; the sidebar reads from there primarily.

---

## §5 — Reconciliation rules

| User action | Auto state | Result | Surface as |
|---|---|---|---|
| Click exclude | ✓ auto | doc removed from bundle, added to `excluded[]` reason `user-exclude` | 🚫 |
| Click include | (not in auto, available in catalog) | doc added to bundle reason `user-include` | 📌 |
| Click include | ⊘ filtered by `load_when` | doc added, `load_when-filter` exclusion cleared (this already works in the assembler) | 📌 with tooltip |
| Click exclude | 🔒 `load: always` | warn (modal); on confirm, doc removed; surface as 🚫 with "overrides always" badge | 🚫 |
| `requires_load` from another doc | irrelevant to user toggle | always wins over `user-exclude`; surface as ⊘ "required by X" | ⊘ |

**The hardest case** is the last row: a user excludes doc A, then doc B's `requires_load` pulls A back in. Today the assembler's final-cleanup makes A emitted but it appears once in `docs[]` (good) and the exclusion is cleared. The sidebar needs to show "you tried to exclude this, but B requires it". Tooltip text. Don't break the user's mental model — they should *see* their exclude is being overridden, not silently get the doc anyway.

---

## §6 — How the sidebar drives a re-render

The bundle is the source of truth. Every toggle must:

1. Write the prefs update (`loom_set_context_prefs` — §4).
2. Re-read `loom://context/{targetId}?mode={mode}` to get the new bundle.
3. Re-render the CONTEXT node from the new bundle.

**Open question:** caching. The pipeline is fast (pure function over in-memory state), but re-running on every click for a long context list could be wasteful. Two options:

- **A:** always re-run; trust the pipeline's speed (it's a pure traversal of `LoomState`). Simpler.
- **B:** the sidebar maintains a local "predicted next bundle" by mutating the previous bundle in-place after a toggle, and lazily reconciles with the next MCP read.

**Lean:** A. Premature optimisation otherwise; the pipeline is sub-ms on realistic state. Revisit only if a real workspace breaks the latency budget.

---

## §7 — Pre-launch visibility (when does the section update?)

The sidebar CONTEXT for a target should reflect what *would* load if the user clicked Reply / do-step / refine *right now*. So it must:

- Recompute on user toggle (§6).
- Recompute on focus change (target changed → re-read for new target).
- Recompute on `LoomState` mutation that affects this target's bundle (a new ref doc added, a `load_when` edited, a `requires_load` link added).

The third one is the tricky one — VS Code's file watcher fires for any `loom/**/*.md` change. Coarse-grained reaction (refresh on any change) is fine for v1; precise dirty-tracking is a Phase 5 nicety.

---

## §8 — Out-of-scope reaffirmed

- Token budgeting / summarisation UI — Phase 5; renders into the same surface later.
- Multi-target session prefs (branch-wide overrides) — out of scope; revisit if requested.
- ctx-load itself — sibling thread.
- Non-VSCode clients of the same prefs file — the MCP path (§4 Option B) leaves the door open; no work in this thread.

---

## §9 — Plan-001 sketch (after decisions land)

1. Add `loom_set_context_prefs` + `loom_get_context_prefs` MCP tools (read/write `.loom/context-prefs.json`).
2. Wire `.loom/context-prefs.json` into the existing `loom://context` resource read path (already designed; check that Phase 1 left a hook).
3. Add CONTEXT child node to the VS Code tree for valid launch targets (chats, plans, designs). Render rows from the bundle.
4. Implement toggle actions (include / exclude / reset) → call `loom_set_context_prefs` → refresh node.
5. Render stale / missing / always-locked badges from bundle metadata.
6. Smoke test: open a chat, exclude an auto-loaded ref, click Reply, verify the `📄` line doesn't appear and the AI doesn't see the doc.

---

## Decisions log (filled in as we discuss)

| # | Question | Decision | Date |
|---|---|---|---|
| §1 | Tree placement | — | — |
| §3 | Prefs schema | — | — |
| §4 | Write path | — | — |
| §5 | `load: always` exclude UX | — | — |
| §6 | Re-render strategy | — | — |
