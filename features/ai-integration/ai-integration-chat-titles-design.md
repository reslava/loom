---
type: design
id: ai-integration-chat-docs-design
title: "Chat Documents — Lightweight AI Conversation Files"
status: active
created: 2026-04-13
version: 1.0.0
tags: [ai, chat, ux, filesystem, archive]
parent_id: workflow-ai-integration-strategy-design
child_ids: []
requires_load: []
---

# Chat Documents — Lightweight AI Conversation Files

## Goal

Introduce an informal, file-based chat document type (`-chat.md`) that captures AI conversations outside the structured workflow state machine. These chats provide searchable, versionable history without polluting core documents, and can be promoted or used as context for workflow actions.

## Context

The workflow system currently embeds all AI conversation within `design.md` files. While this is ideal for feature-specific decision logs, it is too heavy for:
- Exploratory brainstorming before an idea exists.
- Quick questions about a plan.
- Off-topic discussions.

Users need a lightweight scratchpad that still benefits from Reslava's core values: file-based, searchable, Git-versioned, and AI-aware.

# CHAT

## Rafa:
We need a new chat document type. Informal, no frontmatter required, just `# CHAT` and `## User:` / `## AI:` blocks. These files should live in a `chats/` directory and be usable as context for commands like refining a design or creating an idea. After use, they should be archived with metadata.

## AI:
Agreed. This fills a real gap without adding complexity to the core engine. Let's define the specifics.

### 1. Directory Structure

```
workspace-root/
├── .wf/                                         # System configuration
├── chats/                                       # Active, unused chat files
│   └── 2026-04-13-auth-debate.md
├── features/                                    # Active features
├── _archive/                                    # All archived content
│   ├── features/                                # Archived features
│   │   ├── done/
│   │   ├── cancelled/
│   │   ├── postponed/
│   │   └── superseded/
│   └── chats/                                   # Archived (used) chats
│       └── 2026-04/
│           └── 2026-04-13-auth-debate.md
├── references/
└── src/
```

### 2. Chat File Format

Chat files **do not require frontmatter**. They contain only a `# CHAT` heading followed by conversation blocks.

Headers use the configured user name and AI model name when available, falling back to generic defaults.

**Template:**
```markdown
# CHAT

## {{UserName}}:
<!-- User message here -->

## {{AIModel}}:
<!-- AI response here -->
```

**Example (with personalization):**
```markdown
# CHAT

## Rafa:
I think we should use JWT for authentication.

## DeepSeek Chat (deepseek-chat):
JWT is a solid choice for stateless authentication. Consider using short-lived access tokens and refresh rotation for security.
```

If `workflow.user.name` is not set, the header defaults to `## User:`. If the AI model name is unknown, it defaults to `## AI:`.

### 3. Commands

All commands are invoked via the CLI (`wf`) or VS Code context menus.

| Command | Purpose |
|---------|---------|
| `wf chat new [--title "Topic"]` | Creates a new chat file in `chats/` with a timestamped filename. Opens it in the editor. |
| `wf promote <chat-file> --to idea [--feature <name>]` | Creates a new `idea.md` from the chat content. Moves chat to `_archive/chats/`. |
| `wf refine-using-chat <target-doc> <chat-file>` | Uses the chat as context to refine the target document (design or plan). Moves chat to archive. |
| `wf append-chat <chat-file> --to <target-doc>` | Appends the chat content (or a summary) to the target document's `# CHAT` section. Moves chat to archive. |
| `wf chat archive <chat-file>` | Manually archives a chat without using it (e.g., when it's no longer relevant). |

### 4. Archived Chat Metadata

When a chat is moved to `_archive/chats/`, the system injects a minimal frontmatter block at the top of the file to preserve provenance.

```yaml
---
archived_at: 2026-04-13T10:30:00Z
archived_by: "Rafa"
used_in:
  type: "design"
  id: "payment-system-design"
  path: "features/payment-system/payment-system-design.md"
action: "refine"
summary: "Discussed JWT vs OAuth, decided on JWT with refresh tokens."
---
```

| Field | Description |
|-------|-------------|
| `archived_at` | ISO 8601 timestamp of archival. |
| `archived_by` | User name from `workflow.user.name`. |
| `used_in` | Target document that consumed this chat. |
| `action` | How the chat was used: `promote`, `refine`, `append`, or `manual`. |
| `summary` | One-sentence AI-generated summary of the chat's outcome. |

### 5. VS Code Integration

- **Tree View:** A "Chats" node displays all files in `chats/`.
- **Context Menus:**
  - Right-click a chat → "Use to refine design..." → prompts for target document.
  - Right-click a chat → "Promote to idea..." → prompts for feature name.
  - Right-click a chat → "Archive chat..."
- **Command Palette:** All `wf chat` commands are available.

### 6. Implementation Notes

- **No new state machine.** Chats are files, not workflow documents. They do not participate in derived state or validation.
- **AI Summary Generation:** When archiving, the system may optionally call the configured AI model to generate the `summary` field. If the AI is unavailable, the field is left blank or populated with a placeholder.
- **File Watching:** The `chats/` directory is watched for changes to keep the tree view updated.

### 7. Future Enhancements

- **Chat Search:** `wf chats search "JWT"` using the archived metadata summaries.
- **Chat Templates:** Predefined prompts for common scenarios (e.g., "Refine Design", "Brainstorm Feature").
- **Multi-Chat Context:** Support providing multiple chat files to a single command.

## Decision

Adopt the chat document type as described. Implementation is deferred until after the core engine (Plans 001-003) is stable, but the design is now locked in.

## Next Steps

- (Post-MVP) Implement `wf chat` commands.
- (Post-MVP) Add "Chats" node to VS Code tree view.
- (Post-MVP) Implement archive metadata injection.