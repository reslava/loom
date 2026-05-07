---
type: design
id: de_01KQYDFDDCB06E6V25HT94VAP3
title: Workspace Directory Structure — REslava Loom
status: done
created: "2026-04-12T00:00:00.000Z"
updated: 2026-05-06
version: 3
tags: [structure, directories, filesystem, organization, loom]
parent_id: null
requires_load: []
target_release: 0.1.0
actual_release: null
---

# Workspace Directory Structure — REslava Loom

## Goal

Define a clear, scalable, and intuitive directory layout for organizing REslava Loom documents (ideas, designs, plans, contexts, chats, references) within a project workspace. The structure must support both mono‑loom and multi‑loom modes while remaining compatible with Git and the VS Code extension's tree view.

## Context

The Loom system treats Markdown files as the primary data store. The physical arrangement affects:

- **Discoverability:** How easily a user locates a specific thread's documents.
- **Derived Thread Resolution:** The algorithm groups documents into Threads via `parent_id` links, not directory location. However, the directory structure reinforces logical grouping.
- **Reference Management:** Shared resources may be global or thread‑specific.
- **Scalability:** The layout accommodates many threads without becoming unwieldy.

Two organizational models were evaluated:

1. **Type‑Based Grouping:** All documents of a given type in top‑level folders (`designs/`, `plans/`). Flat but scatters related documents.
2. **Thread‑Based Grouping:** Each thread in its own folder containing all related documents. Co‑locates everything for a thread.

This document records the decision and the final directory layout.

# CHAT

## Rafa:
I'm unsure about the final directory structure. Before we had docs grouped by type. Now we're moving to grouping by thread. We also need places for global references and chats. Let's decide.

## AI:
Option B (Thread‑Based) is the clear winner. It co‑locates all documents for a thread, making archiving and navigation intuitive. The VS Code tree view will align with this physical layout.

### 1. Final Directory Structure (Multi‑Loom)

```
~/.loom/config.yaml                           # Global registry (multi‑loom only)

~/looms/<loom-name>/                          # A single loom workspace
│
├── .loom/                                    # Local configuration (committed)
│   ├── workflow.yml                          # Custom workflow (falls back to built‑in)
│   ├── templates/                            # Document templates
│   ├── prompts/                              # AI session prompts
│   ├── schemas/                              # JSON Schemas
│   └── cache/                                # Derived state cache (Git‑ignored)
│
├── chats/                                    # Active, informal AI chats
│   └── 2026-04-14-auth-debate.md
│
├── threads/                                  # All active threads
│   ├── payment-system/
│   │   ├── payment-system-idea.md
│   │   ├── payment-system-design.md          # PRIMARY design (role: primary)
│   │   ├── payment-system-design-webhooks.md # SUPPORTING design
│   │   ├── payment-system-ctx.md             # Auto‑generated summary
│   │   ├── plans/
│   │   │   ├── payment-system-plan-001.md
│   │   │   └── payment-system-plan-002.md
│   │   ├── ctx/                              # Manual session checkpoints
│   │   └── references/                       # Thread‑specific references
│   ├── user-auth/
│   └── _archive/                             # Completed / abandoned
│       ├── threads/
│       │   ├── done/
│       │   ├── cancelled/
│       │   ├── postponed/
│       │   └── superseded/
│       └── chats/                            # Archived chats (with metadata)
│
├── references/                               # Global references
│   ├── style-guide.md
│   ├── adr/
│   └── workspace-directory-structure-reference.md
│
├── .gitignore
├── package.json
└── src/                                      # Application code
```

### 2. Mono‑Loom Mode (In‑Project)

When Loom is used within an existing project (no global registry), the `.loom/` directory, `chats/`, `threads/`, and `references/` live at the project root alongside `src/`.

```
~/dev/my-app/
├── .loom/
├── chats/
├── threads/
├── references/
├── src/
├── package.json
└── .gitignore
```

### 3. Key Naming Conventions (Suffixes)

| Document Type | Filename Pattern | Example |
|---------------|-----------------|---------|
| Idea | `*-idea.md` | `payment-system-idea.md` |
| Design (primary) | `*-design.md` | `payment-system-design.md` |
| Design (supporting) | `*-design-{topic}.md` | `payment-system-design-webhooks.md` |
| Plan | `*-plan-*.md` | `payment-system-plan-001.md` |
| Context summary | `*-ctx.md` | `payment-system-ctx.md` |
| Session checkpoint | `*-ctx-{date}.md` | `payment-system-ctx-2026-04-14.md` |
| Chat | `YYYY-MM-DD-topic.md` | `2026-04-14-auth-debate.md` |

### 4. Design Roles

Each thread has exactly **one primary design** (anchor) and any number of **supporting designs**.

```yaml
role: primary      # Required, one per thread
role: supporting   # Optional, many allowed
```

### 5. Context Files: Two Distinct Purposes

| File | Location | Purpose | Lifecycle |
|------|----------|---------|-----------|
| `*-ctx.md` | Thread root | Auto‑generated summary of current design state | Overwritten on each generation |
| `*-ctx-{date}.md` | `ctx/` subfolder | Manual session checkpoint | Permanent record |

### 6. Chat Files: Lightweight AI Conversations

| Directory | Purpose | Lifecycle |
|-----------|---------|-----------|
| `chats/` (loom root) | Active, unused chats | Created manually or via `loom chat new` |
| `_archive/chats/` | Archived chats after being used | Moved automatically when consumed; injected with metadata |

### 7. Important Files Explained

| Path | Purpose |
|------|---------|
| `~/.loom/config.yaml` | Global registry of all looms (multi‑loom only). |
| `.loom/workflow.yml` | Custom workflow (overrides built‑in default). |
| `.loom/templates/` | Scaffolding templates for `loom weave`. |
| `.loom/prompts/SESSION_START.md` | Bootstrap prompt for AI context. |
| `.loom/cache/` | Local derived state cache (Git‑ignored). |
| `chats/` | Active, informal AI conversations. |
| `threads/<thread>/` | One directory per thread. |
| `threads/<thread>/*-design.md` | PRIMARY design — anchor document. |
| `threads/<thread>/plans/` | Implementation plans. |
| `threads/<thread>/ctx/` | Manual session checkpoints — historical archive. |
| `threads/_archive/` | Completed / abandoned threads and used chats. |
| `references/` | Global documents shared across threads. |

## Decision

Adopt the thread‑based directory structure (Option B) with support for both mono‑loom and multi‑loom modes. Use suffix naming conventions for document types. Keep chats in a dedicated `chats/` directory and archive them after use.

## Next Steps

- Document the final structure in `references/workspace-directory-structure-reference.md`.
- Update templates and CLI commands to reflect this layout.