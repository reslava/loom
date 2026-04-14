---
type: reference
id: cli-commands-reference
title: "REslava Loom CLI Commands Reference"
status: active
created: 2026-04-13
version: 1
tags: [cli, commands, reference]
requires_load: []
---

# REslava Loom CLI Commands Reference

This document catalogs every command available in the `loom` command-line interface. Commands are grouped by functional area.

## Workspace & Initialization

### `loom init`

Initialize a new REslava Loom workspace.

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

Creates `.wf/` directory with default templates and `default-wf.yml`.

---

### `loom doctor`

(Planned) Comprehensive system health check and repair.

**Syntax:**
```bash
loom doctor [--fix]
```

**Options:**
- `--fix`: Automatically repair detected issues where possible.

---

## Feature & Document Management

### `loom new idea`

Create a new idea document.

**Syntax:**
```bash
loom new idea "<Title>" [--feature <name>]
```

**Options:**
- `--feature <name>`: Place the idea inside an existing feature folder. If omitted, creates a new folder based on the title.

**Example:**
```bash
loom new idea "Add Dark Mode" --feature user-preferences
```

Creates `features/user-preferences/user-preferences-idea.md`.

---

### `loom new design`

Create a new design document from an idea or from scratch.

**Syntax:**
```bash
loom new design <feature-id> [--from-idea]
```

**Options:**
- `--from-idea`: Use the existing idea.md as the basis for the design.

**Example:**
```bash
loom new design user-preferences --from-idea
```

Creates `features/user-preferences/user-preferences-design.md`.

---

### `loom new plan`

Create a new implementation plan from a finalized design.

**Syntax:**
```bash
loom new plan <feature-id> [--template <path>]
```

**Options:**
- `--template <path>`: Use a custom plan template instead of the default.

**Example:**
```bash
loom new plan payment-system
```

Creates `features/payment-system/plans/payment-system-plan-001.md`.

---

### `loom status`

Display derived state of all features or a specific feature.

**Syntax:**
```bash
loom status [feature-id] [--verbose] [--json]
```

**Options:**
- `--verbose`: Show detailed document status and relationships.
- `--json`: Output in JSON format for scripting.

**Example:**
```bash
loom status payment-system --verbose
```

---

### `loom list`

List all features with their current status and phase.

**Syntax:**
```bash
loom list [--filter <status>] [--json]
```

**Options:**
- `--filter <status>`: Show only features with a given status (`active`, `done`, `cancelled`).
- `--json`: Output in JSON format.

**Example:**
```bash
loom list --filter active
```

---

### `loom validate`

Check document relationships, frontmatter integrity, and staleness.

**Syntax:**
```bash
loom validate [feature-id] [--all] [--fix]
```

**Options:**
- `--all`: Validate all features in the workspace.
- `--fix`: Attempt to automatically correct fixable issues.

**Example:**
```bash
loom validate payment-system
```

---

### `loom validate-config`

Validate the syntax and semantics of `workflow.yml`.

**Syntax:**
```bash
loom validate-config [--path <path>]
```

**Options:**
- `--path <path>`: Path to a specific `workflow.yml` file.

**Example:**
```bash
loom validate-config
```

---

## AI Collaboration (Native Client)

### `loom ai respond`

**Chat Mode:** Send the current document to the AI and append the response.

**Syntax:**
```bash
loom ai respond [--document <path>] [--model <model>]
```

**Options:**
- `--document <path>`: Specify a document to use as context (default: current feature's design.md).
- `--model <model>`: Override the configured AI model.

**Example:**
```bash
loom ai respond --document features/auth/auth-design.md
```

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

**Example:**
```bash
loom ai propose --document features/auth/auth-design.md
```

---

### `loom summarise-context`

Generate or regenerate the `-ctx.md` summary file for a feature.

**Syntax:**
```bash
loom summarise-context <feature-id> [--force]
```

**Options:**
- `--force`: Overwrite existing summary even if it appears fresh.

**Example:**
```bash
loom summarise-context payment-system --force
```

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

Creates `chats/2026-04-13-jwt-vs-oauth-debate.md`.

---

### `loom promote`

Promote a chat to an idea document.

**Syntax:**
```bash
loom promote <chat-file> --to idea [--feature <name>]
```

**Example:**
```bash
loom promote chats/2026-04-13-brainstorm.md --to idea --feature auth
```

Creates `features/auth/auth-idea.md` and archives the chat.

---

### `loom refine-with-chat`

Use a chat as context to refine a design or plan.

**Syntax:**
```bash
loom refine-with-chat <target-doc> <chat-file> [--auto-approve]
```

**Example:**
```bash
loom refine-with-chat features/auth/auth-design.md chats/security-chat.md
```

---

### `loom append-chat`

Append chat content (or a summary) to a target document's `# CHAT` section.

**Syntax:**
```bash
loom append-chat <chat-file> --to <target-doc> [--summarize]
```

**Options:**
- `--summarize`: Append an AI-generated summary instead of the full conversation.

**Example:**
```bash
loom append-chat chats/quick-question.md --to features/auth/auth-design.md --summarize
```

---

### `loom chat archive`

Manually archive a chat without further action.

**Syntax:**
```bash
loom chat archive <chat-file>
```

**Example:**
```bash
loom chat archive chats/old-discussion.md
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
loom chat search "<query>" [--action <type>] [--feature <id>]
```

**Options:**
- `--action <type>`: Filter by usage (`promote`, `refine`, `append`).
- `--feature <id>`: Filter by associated feature.

---

## Workflow Events (Manual Triggering)

### `loom run`

Manually fire a workflow event.

**Syntax:**
```bash
loom run <feature-id> <event-name> [--payload <json>]
```

**Example:**
```bash
loom run payment-system REFINE_DESIGN
```

---

### `loom refine-design`

Shortcut for `loom run <feature-id> REFINE_DESIGN`.

**Syntax:**
```bash
loom refine-design <feature-id>
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

**Example:**
```bash
loom complete-step payment-system-plan-001 --step 2
```

---

## Maintenance & Repair

### `loom repair`

(Planned) Fix common issues like broken parent links or stale flags.

**Syntax:**
```bash
loom repair [feature-id] [--fix-orphans] [--fix-stale] [--dry-run]
```

**Options:**
- `--fix-orphans`: Remove broken `parent_id` references.
- `--fix-stale`: Recompute and correct `staled` flags.
- `--dry-run`: Show what would be changed without applying.

---

### `loom migrate`

(Planned) Add new optional frontmatter fields to all existing documents.

**Syntax:**
```bash
loom migrate [--add-missing-fields] [--rename-field <old> <new>]
```

---

### `loom archive`

Move a completed or cancelled feature to `_archive/`.

**Syntax:**
```bash
loom archive <feature-id> [--reason <done|cancelled|postponed|superseded>]
```

**Example:**
```bash
loom archive old-checkout --reason superseded
```