---
type: reference
id: vscode-commands-reference
title: "REslava Loom VS Code Commands Reference"
status: active
created: 2026-04-14
version: 1
tags: [vscode, commands, reference, ui]
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
| `Loom: Doctor` | Run system health check and repair. | — | `loom.doctor` |

### Feature & Document Management

| Command | Description | Default Keybinding | Command ID |
|---------|-------------|-------------------|------------|
| `Loom: New Idea` | Create a new idea document. | `Ctrl+Shift+L I` | `loom.newIdea` |
| `Loom: New Design` | Create a new design document from an idea. | `Ctrl+Shift+L D` | `loom.newDesign` |
| `Loom: New Plan` | Create a new implementation plan. | `Ctrl+Shift+L P` | `loom.newPlan` |
| `Loom: Show Status` | Display derived state of the current feature. | `Ctrl+Shift+L S` | `loom.showStatus` |
| `Loom: List Features` | List all features with status and phase. | — | `loom.listFeatures` |
| `Loom: Validate Feature` | Run validation on the current feature. | — | `loom.validateFeature` |
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
| `Loom: New Chat` | Create a new chat file in `chats/`. | `Ctrl+Shift+L C` | `loom.chatNew` |
| `Loom: Promote Chat to Idea` | Convert selected chat to an idea document. | — | `loom.chatPromote` |
| `Loom: Refine with Chat` | Use selected chat to refine a design or plan. | — | `loom.chatRefine` |
| `Loom: Append Chat` | Append chat content to target document. | — | `loom.chatAppend` |
| `Loom: Archive Chat` | Manually archive selected chat. | — | `loom.chatArchive` |

### Workflow Events

| Command | Description | Default Keybinding | Command ID |
|---------|-------------|-------------------|------------|
| `Loom: Refine Design` | Fire `REFINE_DESIGN` event for current feature. | — | `loom.refineDesign` |
| `Loom: Start Plan` | Fire `START_PLAN` event for selected plan. | — | `loom.startPlan` |
| `Loom: Complete Step` | Mark selected step as done. | — | `loom.completeStep` |

### Maintenance

| Command | Description | Default Keybinding | Command ID |
|---------|-------------|-------------------|------------|
| `Loom: Archive Feature` | Move feature to `_archive/`. | — | `loom.archiveFeature` |
| `Loom: Repair Feature` | Fix common issues in current feature. | — | `loom.repairFeature` |

---

## Tree View Context Menus

Commands available when right-clicking nodes in the "REslava Loom" tree view.

### Feature Node

| Command | Description |
|---------|-------------|
| `New Idea` | Create a new idea in this feature. |
| `New Design` | Create a new design (if not exists). |
| `New Plan` | Create a new plan from the design. |
| `AI Respond` | Open Chat Mode with this feature's design. |
| `AI Propose` | Request event proposal for this feature. |
| `Validate Feature` | Run validation. |
| `Show Status` | Display detailed status. |
| `Archive Feature` | Move to `_archive/`. |

### Design Node

| Command | Description |
|---------|-------------|
| `Open Document` | Open the design file. |
| `AI Respond` | Continue conversation in Chat Mode. |
| `AI Propose` | Request event proposal for this design. |
| `Refine Design` | Fire `REFINE_DESIGN` event. |
| `Summarise Context` | Generate context summary. |
| `Reveal in File Explorer` | Show file in system explorer. |

### Plan Node

| Command | Description |
|---------|-------------|
| `Open Document` | Open the plan file. |
| `Start Plan` | Fire `START_PLAN` event. |
| `Complete Step` → (submenu) | Select step to mark done. |
| `Block Plan` | Mark plan as blocked. |
| `Finish Plan` | Mark plan as done. |
| `Reveal in File Explorer` | Show file in system explorer. |

### Chat Node (in `chats/`)

| Command | Description |
|---------|-------------|
| `Open Chat` | Open the chat file. |
| `Promote to Idea` | Create idea from this chat. |
| `Refine Design with Chat...` | Select target design to refine. |
| `Append to Design...` | Select target design to append. |
| `Archive Chat` | Move to `_archive/chats/`. |
| `Reveal in File Explorer` | Show file in system explorer. |

### Archive Node

| Command | Description |
|---------|-------------|
| `Restore Feature` | Move archived feature back to `features/`. |
| `Delete Permanently` | Remove archived feature (with confirmation). |

---

## Editor Context Menus

Commands available when right-clicking inside a `.md` document.

| Command | Description | Applies To |
|---------|-------------|------------|
| `REslava Loom: AI Respond` | Send document (or selection) to AI. | `.md` files |
| `REslava Loom: AI Propose` | Request event proposal. | `.md` files |
| `REslava Loom: Insert AI Response` | Paste last AI response at cursor. | `.md` files |
| `REslava Loom: Format Conversation` | Normalize `## User:` / `## AI:` headers. | `.md` files |

---

## Toolbar Actions

Buttons available in the "REslava Loom" view title bar.

| Icon | Action | Description |
|------|--------|-------------|
| 🔄 | Refresh | Refresh the tree view. |
| ➕ | New... | Dropdown: New Idea, New Design, New Plan, New Chat. |
| 🔍 | Filter | Text filter for tree items. |
| 📁 | Group By | Dropdown: Type, Feature, Status, Release. |
| ⚙️ | Settings | Open extension settings. |

---

## Status Bar Items

| Item | Description |
|------|-------------|
| `Loom: <feature-id>` | Current active feature. Click to switch. |
| `📊 <tokens>` | Session token usage. Click to view details. |
| `🎯 <target_release>` | Target release for current feature (if set). |

---

## Keyboard Shortcuts Summary

| Keybinding | Command |
|------------|---------|
| `Ctrl+Shift+L I` | New Idea |
| `Ctrl+Shift+L D` | New Design |
| `Ctrl+Shift+L P` | New Plan |
| `Ctrl+Shift+L C` | New Chat |
| `Ctrl+Shift+L R` | AI Respond |
| `Ctrl+Shift+L A` | AI Propose |
| `Ctrl+Shift+L S` | Show Status |
| `Ctrl+Shift+L F` | Focus Feature (filter tree) |

*Note: On macOS, `Ctrl` is replaced with `Cmd`.*

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
| `ai.baseUrl` | `string` | `""` | Override API endpoint. |
| `ai.maxContextTokens` | `number` | `8000` | Maximum tokens for AI prompt. |
| `ai.designSummaryThreshold` | `number` | `20000` | Characters before auto-summary. |
| `allowShellCommands` | `boolean` | `false` | Enable `run_command` effect. |
| `fileWatcherDebounceMs` | `number` | `300` | Debounce delay for file watcher. |
| `tree.showArchived` | `boolean` | `false` | Show archived features in tree view. |
| `tree.defaultGrouping` | `string` | `"feature"` | Default grouping mode. |