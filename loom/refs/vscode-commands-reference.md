---
type: reference
id: vscode-commands-reference
title: "REslava Loom VS Code Commands Reference"
status: active
created: 2026-04-14
version: 1
tags: [vscode, commands, reference, ui, loom]
requires_load: []
---

# REslava Loom VS Code Commands Reference

This document catalogs all commands, context menus, toolbar actions, and keyboard shortcuts available in the REslava Loom VS Code extension.

---

## Command Palette Commands

All commands are accessible via `Ctrl+Shift+P` (Windows/Linux) or `Cmd+Shift+P` (macOS) with the prefix `Loom:`.

### Workspace & Initialization

| Command | Description | Default Keybinding | Command ID |
|---------|-------------|-------------------|------------|
| `Loom: Initialize Workspace` | Run `loom init` in the current workspace. | — | `loom.init` |
| `Loom: Setup New Loom` | Create a new named loom workspace. | — | `loom.setup` |
| `Loom: Switch Loom` | Switch active loom context. | — | `loom.switch` |
| `Loom: List Looms` | Show all registered looms. | — | `loom.listLooms` |
| `Loom: Doctor` | Run system health check and repair. | — | `loom.doctor` |

### Thread & Document Management

| Command | Description | Default Keybinding | Command ID |
|---------|-------------|-------------------|------------|
| `Loom: Weave Idea` | Create a new idea document. | `Ctrl+Shift+L I` | `loom.weaveIdea` |
| `Loom: Weave Design` | Create a new design document. | `Ctrl+Shift+L D` | `loom.weaveDesign` |
| `Loom: Weave Plan` | Create a new implementation plan. | `Ctrl+Shift+L P` | `loom.weavePlan` |
| `Loom: Show Status` | Display derived state of current thread. | `Ctrl+Shift+L S` | `loom.showStatus` |
| `Loom: List Threads` | List all threads with status and phase. | — | `loom.listThreads` |
| `Loom: Validate Thread` | Run validation on current thread. | — | `loom.validateThread` |
| `Loom: Validate Configuration` | Validate `workflow.yml` syntax. | — | `loom.validateConfig` |

### AI Collaboration

| Command | Description | Default Keybinding | Command ID |
|---------|-------------|-------------------|------------|
| `Loom: AI Respond` | Send document to AI (Chat Mode). | `Ctrl+Shift+L R` | `loom.aiRespond` |
| `Loom: AI Propose` | Request JSON event proposal (Action Mode). | `Ctrl+Shift+L A` | `loom.aiPropose` |
| `Loom: Summarise Context` | Generate or regenerate `-ctx.md` summary. | — | `loom.summariseContext` |

### Chat Documents

| Command | Description | Default Keybinding | Command ID |
|---------|-------------|-------------------|------------|
| `Loom: New Chat` | Create a new chat file. | `Ctrl+Shift+L C` | `loom.chatNew` |
| `Loom: Promote Chat to Idea` | Convert chat to an idea document. | — | `loom.chatPromote` |
| `Loom: Refine with Chat` | Use chat to refine a design or plan. | — | `loom.chatRefine` |
| `Loom: Append Chat` | Append chat content to target document. | — | `loom.chatAppend` |
| `Loom: Archive Chat` | Manually archive selected chat. | — | `loom.chatArchive` |

### Workflow Events

| Command | Description | Default Keybinding | Command ID |
|---------|-------------|-------------------|------------|
| `Loom: Refine Design` | Fire `REFINE_DESIGN` event. | — | `loom.refineDesign` |
| `Loom: Start Plan` | Fire `START_PLAN` event. | — | `loom.startPlan` |
| `Loom: Complete Step` | Mark selected step as done. | — | `loom.completeStep` |

### Maintenance

| Command | Description | Default Keybinding | Command ID |
|---------|-------------|-------------------|------------|
| `Loom: Archive Thread` | Move thread to `_archive/`. | — | `loom.archiveThread` |
| `Loom: Repair Thread` | Fix common issues in current thread. | — | `loom.repairThread` |
| `Loom: Upgrade to Multi-Loom` | Migrate mono-loom to multi-loom. | — | `loom.upgradeToMulti` |

---

## Tree View Context Menus

### Thread Node

| Command | Description |
|---------|-------------|
| `Weave Idea` | Create a new idea in this thread. |
| `Weave Design` | Create a new design (if not exists). |
| `Weave Plan` | Create a new plan from the design. |
| `AI Respond` | Open Chat Mode with this thread's design. |
| `AI Propose` | Request event proposal for this thread. |
| `Validate Thread` | Run validation. |
| `Show Status` | Display detailed status. |
| `Archive Thread` | Move to `_archive/`. |

### Design Node

| Command | Description |
|---------|-------------|
| `Open Document` | Open the design file. |
| `AI Respond` | Continue conversation in Chat Mode. |
| `AI Propose` | Request event proposal. |
| `Refine Design` | Fire `REFINE_DESIGN` event. |
| `Summarise Context` | Generate context summary. |

### Plan Node

| Command | Description |
|---------|-------------|
| `Open Document` | Open the plan file. |
| `Start Plan` | Fire `START_PLAN` event. |
| `Complete Step` → (submenu) | Select step to mark done. |
| `Block Plan` | Mark plan as blocked. |
| `Finish Plan` | Mark plan as done. |

### Chat Node (in `chats/`)

| Command | Description |
|---------|-------------|
| `Open Chat` | Open the chat file. |
| `Promote to Idea` | Create idea from this chat. |
| `Refine Design with Chat...` | Select target design to refine. |
| `Append to Design...` | Select target design to append. |
| `Archive Chat` | Move to `_archive/chats/`. |

---

## Toolbar Actions

| Icon | Action | Description |
|------|--------|-------------|
| 🔄 | Refresh | Refresh the tree view. |
| ➕ | Weave... | Dropdown: Weave Idea, Weave Design, Weave Plan, New Chat. |
| 🔍 | Filter | Text filter for tree items. |
| 📁 | Group By | Dropdown: Type, Thread, Status, Release. |
| 🧵 | Switch Loom | Quick pick from registered looms. |

---

## Status Bar Items

| Item | Description |
|------|-------------|
| `🧵 Loom: <name>` | Current active loom. Click to switch. |
| `📊 <tokens>` | Session token usage. Click to view details. |
| `🎯 <target_release>` | Target release for current thread (if set). |

---

## Keyboard Shortcuts Summary

| Keybinding | Command |
|------------|---------|
| `Ctrl+Shift+L I` | Weave Idea |
| `Ctrl+Shift+L D` | Weave Design |
| `Ctrl+Shift+L P` | Weave Plan |
| `Ctrl+Shift+L C` | New Chat |
| `Ctrl+Shift+L R` | AI Respond |
| `Ctrl+Shift+L A` | AI Propose |
| `Ctrl+Shift+L S` | Show Status |

---

## Configuration Settings

All settings are prefixed with `reslava-loom.`.

| Setting | Type | Default | Description |
|---------|------|---------|-------------|
| `user.name` | `string` | `""` | Your preferred name for document headers. |
| `user.email` | `string` | `""` | Your email (optional). |
| `ai.provider` | `string` | `"deepseek"` | AI provider (`deepseek`, `openai`, `anthropic`, `ollama`). |
| `ai.apiKey` | `string` | `""` | API key for the selected provider. |
| `ai.model` | `string` | `"deepseek-chat"` | Model name. |
| `ai.maxContextTokens` | `number` | `8000` | Maximum tokens for AI prompt. |
| `ai.designSummaryThreshold` | `number` | `20000` | Characters before auto-summary. |
| `allowShellCommands` | `boolean` | `false` | Enable `run_command` effect. |
| `tree.defaultGrouping` | `string` | `"thread"` | Default grouping mode. |
| `tree.showArchived` | `boolean` | `false` | Show archived threads in tree view. |