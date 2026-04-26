---
type: reference
id: cli-commands-reference
title: "REslava Loom CLI Commands Reference"
status: active
created: 2026-04-14
version: 1
tags: [cli, commands, reference, loom]
requires_load: []
---

# REslava Loom CLI Commands Reference

This document catalogs every command available in the `loom` command-line interface. Commands are grouped by functional area.

## Workspace & Initialization

### `loom init`

Initialize a new REslava Loom workspace in `~/looms/default/` and register it in the global registry.

**Syntax:**
```bash
loom init [--force]
```

**Options:**
- `--force`: Overwrite existing configuration if present.

**Example:**
```bash
loom init
```

Creates `~/looms/default/` with `.loom/` directory and registers it in `~/.loom/config.yaml`.

---

### `loom setup`

Create a new named loom workspace.

**Syntax:**
```bash
loom setup <name> [--path <path>] [--no-switch]
```

**Options:**
- `--path <path>`: Custom path for the loom (default: `~/looms/<name>/`).
- `--no-switch`: Do not set as active loom after creation.

**Example:**
```bash
loom setup test
```

Creates `~/looms/test/`, registers it, and switches to it.

---

### `loom switch`

Switch the active loom context.

**Syntax:**
```bash
loom switch <name>
```

**Example:**
```bash
loom switch test
```

---

### `loom list`

List all registered looms.

**Syntax:**
```bash
loom list [--json]
```

**Options:**
- `--json`: Output in JSON format.

**Example Output:**
```
LOOMS
  default      ~/looms/default
* test         ~/looms/test
```

---

### `loom current`

Show the currently active loom.

**Syntax:**
```bash
loom current
```

---

### `loom doctor`

(Planned) Comprehensive system health check and repair.

**Syntax:**
```bash
loom doctor [--fix]
```

---

## Thread & Document Management

### `loom weave idea`

Create a new idea document.

**Syntax:**
```bash
loom weave idea "<Title>" [--thread <name>]
```

**Options:**
- `--thread <name>`: Place the idea inside an existing thread folder. If omitted, creates a new thread folder based on the title.

**Example:**
```bash
loom weave idea "Add Dark Mode" --thread user-preferences
```

Creates `threads/user-preferences/user-preferences-idea.md`.

---

### `loom weave design`

Create a new design document from an idea or from scratch.

**Syntax:**
```bash
loom weave design <thread-id> [--from-idea]
```

**Options:**
- `--from-idea`: Use the existing idea.md as the basis for the design.

**Example:**
```bash
loom weave design user-preferences --from-idea
```

Creates `threads/user-preferences/user-preferences-design.md`.

---

### `loom weave plan`

Create a new implementation plan from a finalized design.

**Syntax:**
```bash
loom weave plan <thread-id> [--template <path>]
```

**Options:**
- `--template <path>`: Use a custom plan template.

**Example:**
```bash
loom weave plan payment-system
```

Creates `threads/payment-system/plans/payment-system-plan-001.md`.

---

### `loom status`

Display derived state of all threads or a specific thread.

**Syntax:**
```bash
loom status [thread-id] [--verbose] [--json] [--tokens]
```

**Options:**
- `--verbose`: Show detailed document status and relationships.
- `--json`: Output in JSON format for scripting.
- `--tokens`: Show token usage statistics.

**Example:**
```bash
loom status payment-system --verbose
```

---

### `loom list threads`

List all threads with their current status and phase.

**Syntax:**
```bash
loom list threads [--filter <status>] [--json]
```

**Options:**
- `--filter <status>`: Show only threads with a given status (`active`, `done`, `cancelled`).

---

### `loom validate`

Check document relationships, frontmatter integrity, and staleness.

**Syntax:**
```bash
loom validate [thread-id] [--all] [--fix]
```

**Options:**
- `--all`: Validate all threads in the active loom.
- `--fix`: Attempt to automatically correct fixable issues.

---

### `loom validate-config`

Validate the syntax and semantics of `.loom/workflow.yml`.

**Syntax:**
```bash
loom validate-config
```

---

## AI Collaboration (Native Client)

### `loom ai respond`

**Chat Mode:** Send the current document to the AI and append the response.

**Syntax:**
```bash
loom ai respond [--document <path>] [--model <model>] [--minimal] [--full-context]
```

**Options:**
- `--document <path>`: Specify a document to use as context (default: current thread's design.md).
- `--model <model>`: Override the configured AI model.
- `--minimal`: Skip `requires_load` and use summary if available.
- `--full-context`: Force full context even if budget exceeded.

---

### `loom ai propose`

**Action Mode:** Request a structured JSON event proposal from the AI.

**Syntax:**
```bash
loom ai propose [--document <path>] [--auto-approve]
```

**Options:**
- `--document <path>`: Target document for the proposal.
- `--auto-approve`: Skip the approval prompt (use with caution).

---

### `loom summarise-context`

Generate or regenerate the `-ctx.md` summary file for a thread.

**Syntax:**
```bash
loom summarise-context <thread-id> [--force]
```

**Options:**
- `--force`: Overwrite existing summary even if it appears fresh.

---

## Chat Documents (Informal AI Conversations)

### `loom chat new`

Create a new chat file in the `chats/` directory.

**Syntax:**
```bash
loom chat new [--title "<Topic>"] [--model <model>]
```

**Options:**
- `--title "<Topic>"`: Provide a custom title (used in filename).
- `--model <model>`: Specify the AI model used for this chat.

**Example:**
```bash
loom chat new --title "JWT vs OAuth debate"
```

Creates `chats/2026-04-14-jwt-vs-oauth-debate.md`.

---

### `loom promote`

Promote a chat to an idea document.

**Syntax:**
```bash
loom promote <chat-file> --to idea [--thread <name>]
```

**Example:**
```bash
loom promote chats/brainstorm.md --to idea --thread auth
```

---

### `loom refine-with-chat`

Use a chat as context to refine a design or plan.

**Syntax:**
```bash
loom refine-with-chat <target-doc> <chat-file> [--auto-approve]
```

**Example:**
```bash
loom refine-with-chat threads/auth/auth-design.md chats/security-chat.md
```

---

### `loom append-chat`

Append chat content (or a summary) to a target document's `# CHAT` section.

**Syntax:**
```bash
loom append-chat <chat-file> --to <target-doc> [--summarize]
```

---

### `loom chat archive`

Manually archive a chat without further action.

**Syntax:**
```bash
loom chat archive <chat-file>
```

---

### `loom chat list`

List all active chats in the `chats/` directory.

**Syntax:**
```bash
loom chat list [--json]
```

---

### `loom chat search`

(Planned) Search archived chat summaries.

**Syntax:**
```bash
loom chat search "<query>" [--action <type>] [--thread <id>]
```

---

## Workflow Events (Manual Triggering)

### `loom run`

Manually fire a workflow event.

**Syntax:**
```bash
loom run <thread-id> <event-name> [--payload <json>]
```

**Example:**
```bash
loom run payment-system REFINE_DESIGN
```

---

### `loom refine-design`

Shortcut for `loom run <thread-id> REFINE_DESIGN`.

**Syntax:**
```bash
loom refine-design <thread-id>
```

---

### `loom start-plan`

Shortcut for `loom run <plan-id> START_PLAN`.

**Syntax:**
```bash
loom start-plan <plan-id>
```

---

### `loom complete-step`

Mark a specific plan step as done.

**Syntax:**
```bash
loom complete-step <plan-id> --step <n>
```

---

## Maintenance & Repair

### `loom repair`

(Planned) Fix common issues like broken parent links or stale flags.

**Syntax:**
```bash
loom repair [thread-id] [--fix-orphans] [--fix-stale] [--dry-run]
```

---

### `loom migrate`

(Planned) Add new optional frontmatter fields to all existing documents.

**Syntax:**
```bash
loom migrate [--add-missing-fields] [--rename-field <old> <new>]
```

---

### `loom archive`

Move a completed or cancelled thread to `_archive/threads/`.

**Syntax:**
```bash
loom archive <thread-id> [--reason <done|cancelled|postponed|superseded>]
```

**Example:**
```bash
loom archive old-checkout --reason superseded
```

---

### `loom upgrade --to-multi`

Migrate a mono-loom project to multi-loom mode.

**Syntax:**
```bash
loom upgrade --to-multi
```

Moves Loom-specific directories to `~/looms/default/` and creates global registry.