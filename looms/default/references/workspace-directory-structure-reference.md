# Workspace Directory Structure — REslava Loom

Visual reference for a complete REslava Loom workspace.
Shows both system configuration (`.loom/`) and user content (`threads/`, `chats/`).

```
~/.loom/config.yaml                           # Global registry of all looms (multi-loom support)

~/looms/<loom-name>/                          # A single loom workspace
│
├── .loom/                                    # Local configuration (committed to Git)
│   ├── workflow.yml                          # Workflow 
│   │
│   ├── templates/                            # Document templates for `loom weave`
│   │   ├── idea-template.md
│   │   ├── design-template.md
│   │   ├── plan-template.md                  # (formerly plan-template.md)
│   │   └── ctx-template.md
│   │
│   ├── prompts/                              # AI session bootstrap prompts
│   │   └── SESSION_START.md
│   │
│   ├── schemas/                              # JSON Schemas for editor validation
│   │   └── workflow-schema.json
│   │
│   └── cache/                                # Local derived state cache (ignored by Git)
│       └── threads.json
│
├── chats/                                    # Informal AI conversations (unused)
│   └── 2026-04-14-auth-debate.md
│
├── threads/                                  # All active threads live here
│   │
│   ├── payment-system/                       # Thread folder (name = thread ID)
│   │   │
│   │   ├── payment-system-idea.md            # Idea document (optional)
│   │   │
│   │   ├── payment-system-design.md          # PRIMARY design (anchor, required)
│   │   ├── payment-system-design-webhooks.md # Supporting design (role: supporting)
│   │   │
│   │   ├── payment-system-ctx.md             # Auto‑generated context summary
│   │   │
│   │   ├── plans/                            # Implementation plans 
│   │   │   ├── payment-system-plan-001.md
│   │   │   └── payment-system-plan-002.md
│   │   │
│   │   ├── ctx/                              # Manual session checkpoints
│   │   │   └── payment-system-ctx-2026-04-14.md
│   │   │
│   │   └── references/                       # Thread‑specific references
│   │       └── api-spec.pdf
│   │
│   ├── user-auth/                            # Another thread
│   │   ├── user-auth-design.md
│   │   └── plans/
│   │
│   └── _archive/                             # Completed / abandoned threads and chats
│       ├── threads/
│       │   ├── done/
│       │   ├── cancelled/
│       │   ├── postponed/
│       │   └── superseded/
│       └── chats/
│           └── 2026-04/
│
├── references/                               # Global references shared by all threads
│   ├── style-guide.md
│   ├── adr/
│   └── research/
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
| Session checkpoint | `*-ctx-{date}.md` | `payment-system-ctx-2026-04-14.md` |
| Chat | `YYYY-MM-DD-topic.md` | `2026-04-14-auth-debate.md` |

---

## Design Roles

Each thread has exactly **one primary design** (the thread anchor) and any number of **supporting designs** (scoped sub-topics).

```yaml
role: primary      # Required, one per thread
role: supporting   # Optional, many allowed
```

plans may have either the primary or a supporting design as their `parent_id`.

---

## Context Files: Two Distinct Purposes

| File | Location | Purpose | Lifecycle |
|------|----------|---------|-----------|
| `*-ctx.md` | Thread root | Auto-generated summary of current design state | Overwritten on each generation |
| `*-ctx-{date}.md` | `ctx/` subfolder | Manual session checkpoint | Permanent record |

---

## Important Files Explained

| Path | Purpose |
|------|---------|
| `~/.loom/config.yaml` | Global registry of all looms and active context. |
| `.loom/workflow.yml` | User‑provided custom workflow. |
| `.loom/default-wf.yml` | Built‑in default workflow (fallback). |
| `.loom/templates/` | Scaffolding templates for `loom weave`. |
| `.loom/prompts/SESSION_START.md` | Bootstrap prompt for AI context. |
| `.loom/cache/` | Local derived state cache (Git‑ignored). |
| `chats/` | Active, informal AI conversation files. |
| `threads/<thread>/` | One directory per thread. Folder name = thread ID. |
| `threads/<thread>/*-design.md` | PRIMARY design — anchor document. Required. |
| `threads/<thread>/plans/` | Implementation plans. |
| `threads/<thread>/ctx/` | Manual session checkpoints — historical archive. |
| `threads/_archive/` | Completed / abandoned threads and used chats. |
| `references/` | Global documents shared across threads. |

---

## Thread Model Summary

```
Thread (identity = primary design id)
├── 1 idea                    (optional)
├── 1 design (role: primary)  (required — anchor)
├── n designs (role: supporting, sorted by created)
└── n plans (parent_id → primary OR supporting design)
```

## Loom Discovery Modes

REslava Loom supports two operational modes. The physical structure of a loom is **identical** in both modes; only the *location* and *discovery* differ.

### Mono-Loom Mode (Default for Existing Projects)

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

### Multi-Loom Mode (For Multiple Independent Workspaces)

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

### Migrating from Mono to Multi

Run `loom upgrade --to-multi` to move your existing mono-loom project into `~/looms/default/` and register it in the global registry. Your project files (`src/`, `package.json`) remain in their original location; only Loom-specific directories are relocated.
