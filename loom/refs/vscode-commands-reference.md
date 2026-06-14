---
type: reference
id: rf_01KQYDFDDDZDXZDHVWCM2VF3EN
title: vscode — Commands Reference
status: active
created: "2026-04-14T00:00:00.000Z"
version: 3
tags: [vscode, commands, reference, ui, loom, public]
requires_load: []
slug: vscode-commands-reference
load: by-request
---

# Loom VS Code Commands Reference

Catalogs the views, commands, menus, and settings contributed by the Loom VS Code extension (`loom-vscode`, publisher `reslava`). Source of truth: `packages/vscode/package.json` `contributes`.

> The extension is a thin **MCP client** — it talks to the Loom MCP server (`loom mcp`) for all state. It does not edit files directly.

---

## Views

The **Loom** Activity Bar container holds two views:

| View ID | Name | Purpose |
|---------|------|---------|
| `loom.threads` | **Threads** | The document tree: weaves → threads → docs. |
| `loom.context` | **Context** | What the AI will receive for the selected node (the context pipeline bundle). |

When no workspace is initialized, the Threads view shows a welcome with an **Initialize Workspace** button (`loom install`).

---

## Commands

All commands are under the **Loom** category (`Ctrl+Shift+P` → type `Loom:`). The extension contributes **no default keybindings** — assign your own via *Preferences: Open Keyboard Shortcuts* if desired.

### Workspace & tree

| Title | Command ID |
|-------|-----------|
| Refresh | `loom.refresh` |
| Reconnect MCP | `loom.reconnectMcp` |
| New Weave | `loom.weaveCreate` |
| Weave Thread | `loom.threadCreate` |
| Set Grouping | `loom.setGrouping` |
| Filter by text | `loom.setTextFilter` |
| Filter by status | `loom.setStatusFilter` |
| Toggle Archived | `loom.toggleArchived` / `loom.toggleArchivedOff` |
| Sync Doc → Tree | `loom.toggleSyncDocToTree` / `loom.toggleSyncDocToTreeOff` |
| Show Roadmap / Show Threads | `loom.toggleRoadmap` / `loom.toggleRoadmapOff` |
| Group History by Thread / Flatten History | `loom.toggleGroupHistory` / `loom.toggleGroupHistoryOff` |

> **Roadmap view.** *Show Roadmap* re-lays the Threads tree into the derived cross-weave roadmap — **Future** (pending/blocked, dependency + `priority` order, each showing what it's blocked on), **Present** (active/implementing), **History** (shipped plans). In roadmap mode *Filter by status* folds to **all / roadmap / history**, the History band has a **Group History by Thread** toggle, and dragging a Future/Present thread within its band rewrites soft `priority` (`loom_set_priority`) — refusing any drop that violates a hard `depends_on` edge.

### Create documents

| Title | Command ID |
|-------|-----------|
| Weave Idea | `loom.weaveIdea` |
| Weave Design | `loom.weaveDesign` |
| Weave Plan | `loom.weavePlan` |
| Weave Chat | `loom.chatNew` |
| Create Reference | `loom.createReference` |

### AI actions

| Title | Command ID | Notes |
|-------|-----------|-------|
| AI Reply | `loom.chatReply` | Reply inside a chat doc with full thread context loaded. |
| Generate Design (AI) | `loom.generateDesign` | From an idea. |
| Generate Plan (AI) | `loom.generatePlan` | From a design. |
| Refine Idea | `loom.refineIdea` | |
| Refine Design | `loom.refineDesign` | |
| Refine Plan | `loom.refinePlan` | |
| Do Step(s) | `loom.doStep` | Implement the next pending plan step. |
| Refresh Context | `loom.refreshCtx` | Regenerate a ctx summary. |

> There is no `generateIdea` command — an idea is created with **Weave Idea** and filled via **Refine Idea**, or by promoting a chat.

### Promote

| Title | Command ID |
|-------|-----------|
| Promote to Idea | `loom.promoteToIdea` |
| Promote to Design | `loom.promoteToDesign` |
| Promote to Plan | `loom.promoteToPlan` |
| Promote to Reference | `loom.promoteToReference` |

### Plan lifecycle & state

| Title | Command ID |
|-------|-----------|
| Start Plan | `loom.startPlan` |
| Complete Step | `loom.completeStep` |
| Close Plan | `loom.closePlan` |
| Mark Done | `loom.markDone` |
| Mark Active | `loom.markActive` |
| Validate | `loom.validate` |

### Document management

| Title | Command ID |
|-------|-----------|
| Rename Document | `loom.rename` |
| Add References… (`requires_load`) | `loom.addRequiresLoad` |
| Archive | `loom.archive` |
| Restore from Archive | `loom.restoreItem` |
| Delete | `loom.delete` |

### Context panel (the `loom.context` view)

| Title | Command ID | When |
|-------|-----------|------|
| Open Document | `loom.context.openDoc` | Click a row to open the doc/ref in the editor. |
| Include in context | `loom.context.include` | On an excluded or available row. |
| Exclude from context | `loom.context.exclude` | On an auto or locked row. |
| Reset to auto | `loom.context.reset` | On a pinned / excluded / required row. |

---

## Tree context menus

Right-clicking a node in the Threads view exposes actions by node type:

| Node | Actions |
|------|---------|
| **Weave** | New Weave, Weave Thread, Validate, Rename, Archive, Delete |
| **Thread** | Weave Idea / Design / Plan, Weave Chat |
| **Idea** | Refine Idea, Generate Design, Promote to Design / Plan, Add References, Mark Done/Active, Rename, Archive, Delete |
| **Design** | Refine Design, Generate Plan, Weave Plan, Promote to Plan, Add References, … |
| **Plan** (draft/active) | Start Plan |
| **Plan** (implementing) | Do Step(s), Complete Step, Refine Plan, Close Plan |
| **Chat** | AI Reply, Promote to Idea / Design / Plan |
| **ctx section** | Refresh Context |
| **refs section** | Create Reference |

---

## Toolbar (Threads view title bar)

Show Roadmap · New Weave · Set Grouping · Filter by status · Filter by text · Toggle Archived · Sync Doc → Tree · Refresh. In roadmap mode the grouping/text-filter buttons are hidden and a **Group History by Thread** toggle appears.

---

## Settings

All under the `reslava-loom.` prefix:

| Setting | Type | Default | Description |
|---------|------|---------|-------------|
| `reslava-loom.user.name` | string | `""` | Display name used in chat/doc headers. |
| `reslava-loom.ai.provider` | enum (`anthropic` \| `deepseek` \| `openai`) | `anthropic` | Provider for the API-key path. |
| `reslava-loom.ai.apiKey` | string | `""` | API key for the fallback path (not needed if Claude Code CLI is installed). |
| `reslava-loom.ai.model` | string | `""` | Model override; blank uses the provider default. |
| `reslava-loom.ai.baseUrl` | string | `""` | Base URL override for OpenAI-compatible endpoints. |

---

## Get Started walkthrough

The extension ships a `loom.getStarted` walkthrough (*Welcome: Open Walkthrough* → "Get Started with Loom") with four steps: install the CLI, run `loom install`, configure an AI provider, and create your first weave.

---

See the **[Extension User Guide](../../docs/EXTENSION_USER_GUIDE.md)** for task-oriented usage.
