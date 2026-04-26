---
type: reference
id: workspace-directory-structure-reference
title: "Workspace Directory Structure — REslava Loom"
status: active
created: 2026-04-26
version: 2
tags: [reference, structure, filesystem]
load: always
load_when: [idea, design, plan, implementing]
---

# Workspace Directory Structure — REslava Loom

> **Note:** This reference describes the **target structure** (post-migration).
> Migration from `weaves/` + `references/` to `loom/` + `.loom/` is tracked in
> `weaves/core-engine/directory-structure/plans/directory-structure-plan-001.md`.

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
│   └── config.json                    ← workspace settings, LOOM_ROOT, stage
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
    │   └── {chat-id}.md
    │
    ├── .archive/                      ← archived weaves and project-level docs
    │
    └── {weave}/                       ← workstream (e.g. core-engine, vscode-extension)
        │
        ├── ctx.md                     ← weave ctx: summary of all threads in weave
        │
        ├── refs/                      ← weave-scoped architectural facts
        │
        ├── chats/                     ← weave-level AI conversations
        │   └── {chat-id}.md
        │
        ├── .archive/                  ← archived threads and weave-level docs
        │
        └── {thread}/                  ← feature thread
            │
            ├── {thread}-idea.md       ← raw concept
            ├── {thread}-design.md     ← design decisions and conversation log
            │
            ├── ctx/                   ← thread ctx: AI-generated summary
            │
            ├── refs/                  ← thread-scoped references (e.g. API specs)
            │
            ├── chats/                 ← thread-level AI conversations
            │   └── {chat-id}.md
            │
            ├── plans/                 ← implementation plans
            │   └── {plan-id}.md
            │
            ├── done/                  ← post-implementation summaries
            │   └── {done-id}.md
            │
            └── .archive/             ← archived docs for this thread
```

---

## 3-level scope

Every scope (project, weave, thread) supports the same set of directories:

| Directory | At project level | At weave level | At thread level |
|-----------|-----------------|----------------|-----------------|
| `ctx.md` / `ctx/` | `loom/ctx.md` | `loom/{weave}/ctx.md` | `loom/{weave}/{thread}/ctx/` |
| `refs/` | `loom/refs/` | `loom/{weave}/refs/` | `loom/{weave}/{thread}/refs/` |
| `chats/` | `loom/chats/` | `loom/{weave}/chats/` | `loom/{weave}/{thread}/chats/` |
| `.archive/` | `loom/.archive/` | `loom/{weave}/.archive/` | `loom/{weave}/{thread}/.archive/` |

Rules:
- Create any directory only when first needed — don't pre-create empty dirs
- `ctx.md` (project + weave) is a single file; `ctx/` (thread) is a directory of session summaries
- `refs/` contains static facts; never put AI-generated content in `refs/`

---

## File naming conventions

| Document type | Pattern | Example |
|---------------|---------|---------|
| Idea | `{thread}-idea.md` | `stripe-integration-idea.md` |
| Design | `{thread}-design.md` | `stripe-integration-design.md` |
| Plan | `{plan-id}.md` | `stripe-integration-plan-001.md` |
| Done | `{done-id}.md` | `stripe-integration-done-001.md` |
| Chat | `{chat-id}.md` | `mcp-chat.md` |
| Ctx (file) | `ctx.md` | `ctx.md` |
| Reference | `{id}.md` | `architecture.md` |

---

## Frontmatter: canonical field order

```yaml
---
type: idea | design | plan | done | chat | ctx | reference
id: kebab-case-id
title: "Human Readable Title"
status: draft | active | implementing | done | archived
created: YYYY-MM-DD
version: 1
tags: []
parent_id: null
child_ids: []
requires_load: []
# design-specific:
role: primary | supporting
target_release: "0.x.0"
actual_release: null
design_version: 1          # plan field — stale when < parent design.version
# reference-specific:
load: always | by-request
load_when: [idea, design, plan, implementing]
---
```

---

## Ctx hierarchy

Agents read ctx top-down: project → weave → thread. Each level summarizes its scope without
duplicating the level above.

| Level | Path | Summarizes |
|-------|------|-----------|
| Project | `loom/ctx.md` | Architecture refs + `load: always` docs + active weaves roster |
| Weave | `loom/{weave}/ctx.md` | All threads, statuses, active plan summary |
| Thread | `loom/{weave}/{thread}/ctx/` | Idea + design decisions + plan progress |

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
