---
type: design
id: ai-command-palette-design
title: "AI Command Palette — Promote, Refine, Summarize"
status: draft
created: 2026-04-22
version: 1
tags: [ai, commands, promote, refine, summarize, vscode]
parent_id: null
child_ids: []
requires_load: [ai-integration-design]
target_release: "0.3.0"
actual_release: null
---

# AI Command Palette — Promote, Refine, Summarize

## Goal

Define the full set of AI-assisted authoring commands: their names, source doc types,
what they create or update, and how they integrate with the existing event-sourced model.

## Command Definitions

### Promote commands — create a new doc from an existing one

| Command | Source doc(s) | Creates | Notes |
|---------|--------------|---------|-------|
| `loom.promoteToIdea` | chat | new idea doc | Renamed from `promoteIdea` |
| `loom.promoteToDesign` | chat, idea | new design doc | Sets `parent_id` to source doc |
| `loom.promoteToPlan` | chat, idea, design | new plan doc | Sets `parent_id` to source doc |

**Naming rule:** `promoteTo{Type}` — the `To` makes the destination type explicit.
"Promote to idea" is unambiguous; "promote idea" sounds like the idea already exists.

### Refine commands — update an existing doc

| Command | Target doc | Effect |
|---------|-----------|--------|
| `loom.refineIdea` | idea | AI rewrites/improves body, version++ |
| `loom.refineDesign` | design | Fires `REFINE_DESIGN` event, version++, stales child plans |
| `loom.refinePlan` | plan | AI updates steps table |

`refineDesign` already exists via the `REFINE_DESIGN` workflow event. `refineIdea` and
`refinePlan` need new reducers — ideas and plans currently have no version-bump path.

### Summarize command — generate context doc

| Command | Source | Creates |
|---------|--------|---------|
| `loom.summarize` | chat, weave, or thread | `{id}-ctx.md` |

The existing `summarise` command is template-based (stub). It must be wired to `aiClient`
so it generates real content. Scope: any of the three source types, triggered from the
tree node context menu.

## Implementation notes

- All `promoteTo*` use-cases follow the same shape as `promoteToIdea`: load source doc,
  send to AI with a structured system prompt, parse response, save new doc.
- All `refine*` use-cases must read the current doc, send it to AI for improvement,
  write the result back, and bump `version`. Only `refineDesign` fires a workflow event
  (to stale children); `refineIdea` and `refinePlan` write the file directly.
- `summarize` should replace the current stub in `app/src/summarise.ts`.
- The `promoteIdea` rename touches: `app/src/promoteIdea.ts` (filename + export),
  `vscode/src/commands/promoteIdea.ts` (filename + import), `extension.ts` (command ID),
  `package.json` (command + menu entry).

## Decisions

- **`promoteToIdea` not `promoteIdea`** — `To` makes the direction unambiguous. ✅
- **Chats can be source for all promote commands** — a chat is the natural starting point
  before any structured doc exists. ✅
- **`summarize` scope: chat + weave + thread** — three separate triggers in the context
  menu, same use-case with a `scope` parameter. ✅
- **`refineDesign` reuses `REFINE_DESIGN` event** — keeps the event-sourced model intact.
  `refineIdea` / `refinePlan` do not need events (no downstream staleness side-effects). ✅
