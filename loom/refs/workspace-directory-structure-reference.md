---
type: reference
id: rf_01KQYDFDDD31MDCMHA1TDAG0EG
title: loom — Workspace Directory Structure
status: active
created: "2026-04-26T00:00:00.000Z"
version: 3
tags: [reference, structure, filesystem, public]
slug: workspace-directory-structure-reference
load: always
load_when: [idea, design, plan, implementing]
---

# loom — Workspace Directory Structure

> **Note:** This reference describes the **target structure** (post-migration).
> Migration from `weaves/` + `references/` to `loom/` + `.loom/` is tracked in
> `loom/core-engine/directory-structure/plans/directory-structure-plan-001.md`.

---

## Top-level layout

```
{project-root}/
  .loom/         ← project config (hidden, tool-managed)
  loom/          ← all Loom docs (human + AI content)
  packages/      ← source code (example — project-specific)
  src/           ← source code (example — project-specific)
```

**`.loom/`** is config and tool state — managed by Loom, never edited directly.  
**`loom/`** is the document graph — owned jointly by human and AI.

---

## Full structure

```
{project-root}/
│
├── .loom/                             ← project config (hidden, tool-managed)
│   ├── config.json                    ← workspace settings, LOOM_ROOT, stage
│   └── context-prefs.json             ← per-target context include/exclude overrides (sidebar-edited)
│
└── loom/                              ← docs root (was: weaves/ + references/)
    │
    ├── ctx.md                         ← global ctx: project summary (AI-generated)
    │
    ├── refs/                          ← static architectural facts (was: references/)
    │   ├── architecture.md
    │   ├── workspace-directory-structure-reference.md  ← this file
    │   └── ...
    │
    ├── chats/                         ← project-level AI conversations
    │   └── chat-NNN.md
    │
    ├── .archive/                      ← SINGLE archive root for the whole repo;
    │                                     mirrors source paths: loom/.archive/{weave}/{thread}/...
    │                                     (no per-weave / per-thread .archive — see "Archiving" below)
    │
    └── {weave}/                       ← workstream (e.g. core-engine, vscode-extension)
        │
        ├── ctx.md                     ← weave ctx: summary of all threads in weave
        │
        ├── refs/                      ← weave-scoped architectural facts
        │
        ├── chats/                     ← weave-level AI conversations
        │   └── chat-NNN.md
        │
        └── {thread}/                  ← feature thread
            │
            ├── thread.md              ← thread manifest (th_ ULID + priority + depends_on)
            ├── req.md                 ← locked scope spec (optional)
            ├── idea.md                ← raw concept
            ├── design.md              ← design decisions and conversation log
            │
            ├── refs/                  ← thread-scoped references (e.g. API specs)
            │
            ├── chats/                 ← thread-level AI conversations
            │   └── chat-NNN.md
            │
            ├── plans/                 ← implementation plans
            │   └── plan-NNN.md
            │
            └── done/                  ← post-implementation summaries
                └── plan-NNN-done.md
```

---

## 3-level scope

Every scope (project, weave, thread) supports the same set of directories:

| Directory | At project level | At weave level | At thread level |
|-----------|-----------------|----------------|-----------------|
| `ctx.md` | `loom/ctx.md` | `loom/{weave}/ctx.md` | — (no thread ctx) |
| `refs/` | `loom/refs/` | `loom/{weave}/refs/` | `loom/{weave}/{thread}/refs/` |
| `chats/` | `loom/chats/` | `loom/{weave}/chats/` | `loom/{weave}/{thread}/chats/` |
| archived docs | `loom/.archive/` | `loom/.archive/{weave}/` | `loom/.archive/{weave}/{thread}/` |

Rules:

- Create any directory only when first needed — don't pre-create empty dirs
- `ctx.md` is a single file at project and weave scope; there is no thread-level ctx (a thread's idea/design/plan load in full via the parent chain, so a thread ctx would just duplicate them)
- `refs/` contains static facts; never put AI-generated content in `refs/`
- **Archiving uses one root.** There is a single `loom/.archive/` at the repo root — never a `.archive/` per weave or thread. Archive any doc by moving it to `loom/.archive/{weave}/{thread}/...`, mirroring its live path. `findMarkdownFiles` skips any directory named `.archive`, so archived docs drop out of derived state automatically. Use the `loom_archive` MCP tool rather than moving files by hand.

---

## File naming conventions

| Document type | Pattern | Example |
|---------------|---------|---------|
| Idea | `idea.md` | `idea.md` |
| Design | `design.md` | `design.md` |
| Plan | `plan-NNN.md` | `plan-001.md` |
| Done | `plan-NNN-done.md` | `plan-001-done.md` |
| Chat | `chat-NNN.md` | `chat-002.md` |
| Req | `req.md` | `req.md` |
| Thread manifest | `thread.md` | `thread.md` |
| Ctx (file) | `ctx.md` | `ctx.md` |
| Reference | `{slug}.md` | `architecture-reference.md` |

Filenames are flat and canonical — identity lives in frontmatter ULIDs, so a thread/weave folder rename rewrites zero doc content. Ordinals (`plan-NNN`, `chat-NNN`) are assigned by creation order and never renumbered on delete (gaps allowed).

---

## Frontmatter: canonical field order

```yaml
---
type: idea | design | plan | done | chat | ctx | reference | req | thread
id: kebab-case-id
title: "Human Readable Title"
status: draft | active | implementing | done | archived
created: YYYY-MM-DD
version: 1
tags: []
parent_id: null
child_ids: []
requires_load: []
target_release: "0.x.0"
actual_release: null
design_version: 1          # plan field — stale when < parent design.version
# reference-specific:
load: always # always | by-request
load_when: [idea, design, plan, implementing]
---
```

---

## Ctx hierarchy

Agents read ctx top-down: project → weave. Each level summarizes its scope without
duplicating the level above. There is no thread-level ctx — a thread's idea, design,
and plan load in full via the parent chain.

| Level | Path | Summarizes |
|-------|------|-----------|
| Project | `loom/ctx.md` | Architecture refs + `load: always` docs + active weaves roster |
| Weave | `loom/{weave}/ctx.md` | All threads, statuses, active plan summary |

Regenerate stale ctx with `loom_refresh_ctx`. Check all stale docs with `loom_get_stale_docs`.

---

## Stale detection rules

- A plan is stale when `plan.design_version < parent_design.version`
- A ctx is stale when it was generated before the last update to its parent scope
- `loom_get_stale_docs` returns all stale docs across the project

---

## `.loom/` vs `loom/`

| `.loom/` | `loom/` |
|----------|---------|
| Hidden (dotfile) | Visible |
| Config and tool state | Human + AI content |
| Managed by Loom CLI | Edited by humans and AI |
| Never commit secrets | Committed to git |
| Stage 1: contains `_status.md` | Stage 2: `_status.md` removed |
