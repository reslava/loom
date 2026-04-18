# Workspace Directory Structure — REslava Loom

Visual reference for a complete REslava Loom workspace.
Shows both system configuration (`.loom/`) and user content (`threads/`, `chats/`).

## Loom Discovery Modes

REslava Loom supports two operational modes. The physical structure of a loom is **identical** in both modes; only the *location* and *discovery* differ.

### Mono‑Loom Mode (Default for Existing Projects)

The `.loom/` directory lives at the root of your project, alongside `src/`, `package.json`, etc.

```
~/dev/my-cool-app/
├── .loom/                    # Loom configuration
├── chats/                    # Informal chats
├── threads/                  # Feature threads
├── references/               # Global references
├── src/                      # Your application code
├── package.json
└── .gitignore
```

**Behavior:** The CLI detects `.loom/` in the current directory (or any parent). No global registry is used. Ideal for a single project.

### Multi‑Loom Mode (For Multiple Independent Workspaces)

All looms live under `~/looms/`. A global registry at `~/.loom/config.yaml` tracks them.

```
~/looms/
├── default/                  # Your main loom
│   ├── .loom/
│   ├── chats/
│   ├── threads/
│   └── references/
├── test/                     # A safe sandbox loom
│   └── ...
└── experimental/             # Another loom
    └── ...
```

**Behavior:** The CLI reads `~/.loom/config.yaml` to determine the active loom. Commands like `loom switch <name>` change context. Ideal for managing multiple projects or experimenting safely.

---

## Detailed Directory Structure (Mono‑Loom Shown)

```
workspace-root/
│
├── .loom/                                    # Local configuration (committed)
│   ├── workflow.yml                          # Custom workflow (falls back to built‑in)
│   ├── cache/                                # Derived state cache (ignored by Git)
│   ├── prompts/                              # AI session bootstrap prompts
│   │   └── SESSION_START.md
│   └── schemas/                              # JSON Schemas for editor validation
│       └── workflow-schema.json
│
├── chats/                                    # Active, informal AI conversations
│   └── 2026-04-18-auth-debate.md
│
├── threads/                                  # All active threads
│   │
│   ├── payment-system/                       # Thread folder (name = thread ID)
│   │   │
│   │   ├── payment-system-idea.md            # Idea document (optional)
│   │   │
│   │   ├── payment-system-design.md          # PRIMARY design (role: primary, required)
│   │   ├── payment-system-design-webhooks.md # SUPPORTING design (role: supporting)
│   │   │
│   │   ├── payment-system-ctx.md             # Auto‑generated context summary (overwritten)
│   │   │
│   │   ├── plans/                            # Active implementation plans
│   │   │   ├── payment-system-plan-001.md
│   │   │   └── payment-system-plan-002.md
│   │   │
│   │   ├── done/                             # Completed documents (preserves thread context)
│   │   │   ├── payment-system-retrospective.md
│   │   │   └── plans/
│   │   │       └── payment-system-plan-000.md
│   │   │
│   │   ├── deferred/                         # Postponed ideas, designs, or plans
│   │   │   └── payment-system-v2-idea.md
│   │   │
│   │   ├── chats/                            # Archived chats related to this thread
│   │   │   └── 2026-04-15-design-debate.md
│   │   │
│   │   └── references/                       # Thread‑specific reference files
│   │       └── api-spec.pdf
│   │
│   ├── user-auth/                            # Another active thread
│   │   ├── user-auth-design.md
│   │   ├── plans/
│   │   ├── done/
│   │   └── ...
│   │
│   └── _archive/                             # Threads that are completely finished or abandoned
│       ├── cancelled/                        # Decided not to pursue
│       │   └── old-checkout/
│       └── superseded/                       # Replaced by a different feature or design
│           └── legacy-api/
│
├── references/                               # Global references shared by all threads
│   ├── style-guide.md
│   ├── adr/                                  # Architecture Decision Records
│   │   ├── adr-001-database-choice.md
│   │   └── adr-002-api-design.md
│   ├── cli-commands-reference.md
│   ├── vscode-commands-reference.md
│   └── workspace-directory-structure-reference.md
│
├── .gitignore
├── package.json
├── src/                                      # Application source code
└── ...
```

---

## Key File Naming Conventions (Suffixes)

| Document Type | Filename Pattern | Example |
|---------------|-----------------|---------|
| Idea | `*-idea.md` | `payment-system-idea.md` |
| Design (primary) | `*-design.md` | `payment-system-design.md` |
| Design (supporting) | `*-design-{topic}.md` | `payment-system-design-webhooks.md` |
| Plan | `*-plan-*.md` | `payment-system-plan-001.md` |
| Context summary | `*-ctx.md` | `payment-system-ctx.md` |
| Session checkpoint | `*-ctx-{date}.md` | `payment-system-ctx-2026-04-18.md` |
| Chat | `YYYY-MM-DD-topic.md` | `2026-04-18-auth-debate.md` |

---

## Thread‑Based Archive Strategy

To preserve context, each thread contains its own `done/`, `deferred/`, and `chats/` subdirectories. This ensures all work related to a feature stays together, even after completion.

| Directory | Purpose |
| :--- | :--- |
| `threads/<thread>/done/` | Completed documents (designs, plans, ideas) that are no longer active. |
| `threads/<thread>/deferred/` | Postponed work that may be revisited later. |
| `threads/<thread>/chats/` | Archived chat conversations specific to this thread. |

Threads that are entirely abandoned or replaced are moved to `threads/_archive/cancelled/` or `threads/_archive/superseded/`, preserving their internal structure.

---

## Design Roles

Each thread has exactly **one primary design** (the thread anchor) and any number of **supporting designs** (scoped sub‑topics).

```yaml
role: primary      # Required, one per thread
role: supporting   # Optional, many allowed
```

Plans may have either the primary or a supporting design as their `parent_id`.

---

## Context Files: Two Distinct Purposes

| File | Location | Purpose | Lifecycle |
|------|----------|---------|-----------|
| `*-ctx.md` | Thread root | Auto‑generated summary of current design state | Overwritten on each generation |
| `*-ctx-{date}.md` | `ctx/` subfolder | Manual session checkpoint | Permanent record |

---

## Important Files Explained

| Path | Purpose |
|------|---------|
| `~/.loom/config.yaml` | Global registry of all looms (multi‑loom only). |
| `.loom/workflow.yml` | Custom workflow (overrides built‑in default). |
| `.loom/cache/` | Local derived state cache (Git‑ignored). |
| `chats/` (root) | Active, informal AI conversations. |
| `threads/<thread>/` | One directory per thread. |
| `threads/<thread>/*-design.md` | PRIMARY design — anchor document. |
| `threads/<thread>/plans/` | Active implementation plans. |
| `threads/<thread>/done/` | Completed documents for this thread. |
| `threads/<thread>/deferred/` | Postponed work for this thread. |
| `threads/<thread>/chats/` | Archived chats related to this thread. |
| `threads/_archive/` | Entirely finished or abandoned threads. |
| `references/` | Global documents shared across threads. |

---

## Thread Model Summary

```
Thread (identity = primary design id)
├── 1 idea                    (optional)
├── 1 design (role: primary)  (required — anchor)
├── n designs (role: supporting, sorted by created)
├── n plans (active)
├── done/                     (completed documents)
├── deferred/                 (postponed work)
└── chats/                    (archived conversations)
```