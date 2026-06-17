---
type: plan
id: pl_01KQZ2J17RW4CH45MREYJC499B
title: Context Sidebar — Implementation Plan
status: done
created: 2026-05-06
updated: 2026-06-06
version: 4
design_version: 1
tags: []
parent_id: de_01KQZ2HGVC1W2V48A6RMCT3FA5
requires_load: []
target_version: 0.1.0
actual_release: 1.0.0
---
# Context Sidebar — Implementation Plan

| | |
|---|---|
| **Created** | 2026-05-06 |
| **Status** | DRAFT |
| **Design** | `de_01KQZ2HGVC1W2V48A6RMCT3FA5` |
| **Target version** | 0.6.0 |

---

# Goal

Implement the context sidebar in the VS Code extension: a panel below the tree that shows and controls which docs will be injected into the next MCP tool call via `context_ids`.

---

# Steps

| # | Step | Status |
|---|------|--------|
| 1 | Fix ULID missing bug in extension chat creation | 🔳 |
| 2 | Implement local token estimator utility | 🔳 |
| 3 | Implement context sidebar UI (pinned + opt-in, token badge, toggle) | 🔳 |
| 4 | Add optional `context_ids` param to MCP tools | 🔳 |
| 5 | Wire sidebar state into MCP tool calls | 🔳 |

---

## Step 1 — Fix ULID missing bug in extension chat creation

Ensure chat docs created from the extension go through the `loom_create_chat` MCP tool (not direct file write), so frontmatter gets a ULID-based `id`. Locate where the extension currently writes chat files directly and replace with the MCP call.

**Files likely touched:** `packages/vscode/src/commands/` — whichever command creates chats.

---

## Step 2 — Implement local token estimator utility

Create `packages/vscode/src/services/tokenEstimatorService.ts`. Estimates tokens as `Math.ceil(content.length / 4)`. Maintains an in-memory cache: `Map<filePath, { tokens: number, mtime: number }>`. Registers a `vscode.workspace.onDidSaveTextDocument` listener to invalidate cache entries on save. Exposes `estimate(filePath: string): Promise<number>`.

**Files touched:** `packages/vscode/src/services/tokenEstimatorService.ts` (new), `packages/vscode/src/extension.ts` (register service).

---

## Step 3 — Implement context sidebar UI

Create a `ContextSidebarProvider` implementing `vscode.TreeDataProvider`. Register it in the Loom sidebar container below the main tree. Tree items: section headers ("Pinned", "Opt-in"), doc items with type icon, title, token badge as description, and toggle command as inline button (pinned items show lock icon, no toggle). Auto-refresh: listen to main tree selection changes and re-resolve context per the design table.

**Files touched:** `packages/vscode/src/providers/contextSidebarProvider.ts` (new), `packages/vscode/src/extension.ts` (register provider), `package.json` (contributes.views).

---

## Step 4 — Add optional context_ids param to MCP tools

In `packages/mcp/src/tools/`, add `context_ids?: string[]` to the input schema of `loom_do_step`, `loom_generate_plan`, `loom_generate_design`, `loom_refine_plan`, `loom_refine_design`. In each handler: if `context_ids` is present and non-empty, load each doc by ID via `threadRepository` and prepend their content to the prompt context block before the AI call.

**Files touched:** the five tool files in `packages/mcp/src/tools/`.

---

## Step 5 — Wire sidebar state into MCP tool calls

In `packages/vscode/src/commands/`, for each command that invokes one of the five MCP tools above: read `contextSidebarService.getSelectedIds()` and include the result as `context_ids` in the tool call arguments.

**Files touched:** `packages/vscode/src/commands/doStep.ts`, `generatePlan.ts`, `generateDesign.ts`, `refineDesign.ts`, `refinePlan.ts` (or equivalent).

---

## Legend

| Symbol | Meaning |
|--------|---------|
| ✅ | Done |
| 🔄 | In Progress |
| 🔳 | Pending |
| ❌ | Cancelled |
