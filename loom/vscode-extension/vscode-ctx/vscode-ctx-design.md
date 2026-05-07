---
type: design
id: de_01KQZ2HGVC1W2V48A6RMCT3FA5
title: Context Sidebar — Design
status: done
created: "2026-05-06T00:00:00.000Z"
updated: "2026-05-06T00:00:00.000Z"
version: 3
tags: []
parent_id: id_01KQZ2H5AHBR0C9AB1V54HSE17
requires_load: []
---
# Context Sidebar — Design

## Goal
Give the user visibility into and control over which docs are injected into the next MCP tool call. The sidebar shows the active context set, lets the user toggle items in and out, displays token estimates per item and a total, and passes the selection as `context_ids` when any MCP-backed command fires.

## Context
Decisions locked in `vscode-ctx-chat-001`:
- **Token count:** local estimator (chars/4), cached per doc path, invalidated on file save. Implemented in a shared `TokenEstimatorService` in `packages/vscode`.
- **Pinned vs opt-in:** some docs auto-include (pinned, lock icon), others require explicit toggle (opt-in).
- **Injection mechanism (option b):** extension passes `context_ids: string[]` to MCP tool calls; MCP server loads and injects the docs server-side before the AI call.
- **ULID fix:** chat creation must go through `loom_create_chat` MCP tool, not direct file write.

---

# CHAT

## User:

### Panel location
Below the main Loom tree view, as a separate VS Code `TreeDataProvider` registered in the same Loom sidebar container.

### Auto-refresh trigger
Fires when the main tree selection changes (active node = plan, design, idea, chat, or ctx doc).

### Context resolution by selected node type

| Selected node | Pinned context |
|---|---|
| Plan | thread idea + design + active plan + weave ctx + global ctx |
| Design | thread idea + design + weave ctx + global ctx |
| Idea | thread idea + weave ctx + global ctx |
| Chat | parent thread docs + weave ctx + global ctx |
| Ctx | that ctx + global ctx |

`requires_load` entries from any pinned item are also added to pinned (one level, no recursion).

### Pinned section
Auto-included docs. Cannot be unloaded during a session — user can unpin (moves to opt-in, toggled off). Show a lock icon. No toggle button.

### Opt-in section
Chats and reference docs for the active thread/weave. Off by default. Each item has a toggle button. Reference docs (`-reference.md`) also get an "Add to context" inline button directly in the main tree view.

### Each context item shows
- Type badge (idea / design / plan / ctx / chat / reference)
- Doc title (truncated to fit)
- Token estimate (e.g. `~1.2k tokens`)
- Toggle button (opt-in) or lock icon (pinned)

### Footer
Total token count across all loaded items. E.g. `# tokens: 4.5k`.

### Injection
When user triggers DoStep, GeneratePlan, GenerateDesign, RefineDesign, or RefinePlan — the extension reads `contextSidebarService.getSelectedIds()` and passes the result as `context_ids` in the MCP tool call arguments.

### MCP tool changes
Add optional `context_ids?: string[]` to:
- `loom_do_step`
- `loom_generate_plan`
- `loom_generate_design`
- `loom_refine_plan`
- `loom_refine_design`

MCP server: if `context_ids` is present and non-empty, load each doc by ID and prepend their content to the prompt context block before the AI call.