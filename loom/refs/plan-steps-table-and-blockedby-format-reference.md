---
type: reference
id: rf_01KR3K003KHHTV0DKV71GX6FAG
title: loom — Plan Steps Schema, Table View, and BlockedBy Format
status: active
created: "2026-05-08T00:00:00.000Z"
updated: 2026-06-10
version: 3
tags: [reference, internal, plan, workflow]
parent_id: null
requires_load: []
slug: plan-steps-table-and-blockedby-format
description: How plan steps work — structured steps in frontmatter (source of truth), the generated Steps table, and the BlockedBy format. Load this when creating or editing plans.
load: by-request
load_when: [plan]
---
# loom — Plan Steps: Schema, Table View, and BlockedBy Format

> **As of v1.3.0, plan steps are structured data in YAML frontmatter — the single
> source of truth. The `## Steps` table in the body is a *generated view*. You never
> hand-author the table; Loom owns it.**

---

## Creating and editing plans — do not write the table

Create a plan with **`loom_create_plan`**, passing `goal` (prose) + a structured
`steps` array of objects:

```jsonc
{
  "weaveId": "...", "threadId": "...", "title": "...",
  "goal": "One paragraph: what this plan implements and why.",
  "steps": [
    { "description": "First step", "files": ["a.ts"], "satisfies": ["IN1"], "detail": "- bullet…" },
    { "description": "Second step", "blockedBy": ["first-step"] }
  ]
}
```

- **Never pass a Markdown steps table.** `loom_create_plan` does **not** accept a
  `content` body (idea/design/reference still do). Loom synthesizes each step's stable
  `id`, sets `status: pending`, and renders the canonical table + per-step sections.
- To change steps later, use the step tools (`loom_complete_step`, etc.) or
  `loom_update_doc` for the surrounding prose. `loom_update_doc` on a frontmatter-native
  plan **does not** re-derive steps from the body — the table is regenerated from
  frontmatter, so editing it by hand has no effect.

---

## Frontmatter step schema (the source of truth)

Each entry in the plan's `steps:` block is persisted as:

```yaml
steps:
  - id: domain-model          # stable slug, unique within the plan; survives reordering
    order: 1                  # display order (1-based)
    status: pending           # pending | in_progress | done | cancelled
    description: First step    # the table "Step" cell
    files_touched: [a.ts, b.ts]
    blocked_by: [domain-model] # step ids and/or plan ids — see below
    satisfies: [IN1, C2]       # requirement handles this step advances
```

`title` and `detail` are **not** persisted — they are create-time inputs that seed the
body's `### Step N` sections (authored prose lives in the body, never duplicated in
frontmatter).

---

## The generated Steps table (a view)

Loom renders this canonical 6-column table from the frontmatter steps. The `Done` cell
is a pure render of `status`:

```markdown
## Steps

| Done | # | Step | Files touched | Blocked by | Satisfies |
|---|---|---|---|---|---|
| ✅ | 1 | First step | a.ts, b.ts | — | IN1 |
| 🔳 | 2 | Second step | — | domain-model | — |

---

### Legend

| Symbol | Meaning |
|--------|---------|
| ✅ | Done |
| 🔄 | In Progress |
| 🔳 | Pending |
| ❌ | Cancelled |
```

| Status | Symbol |
|---|---|
| `done` | ✅ |
| `in_progress` | 🔄 |
| `pending` | 🔳 |
| `cancelled` | ❌ |

---

## BlockedBy format

`blocked_by` is a list of blocker tokens. Each is one of:

| Token | Meaning | Example |
|---|---|---|
| `{step-id}` | Another step in **this** plan (canonical) | `domain-model` |
| `{plan-id}` | Entire other plan (all steps) | `vscode-mcp-refactor-plan-001` |
| `{plan-id} N` | Step N of another plan | `vscode-mcp-refactor-plan-001 3` |
| `N` (integer) | Step N of this plan — **legacy**, still resolved | `3` |

**Rules:**
- Prefer **stable step ids** for same-plan dependencies — they survive reordering.
  Bare integers (`3`, `Step 3`) are legacy: `isStepBlocked` still resolves them by
  `order`, but reordering corrupts them, so don't author new ones.
- A bare integer always refers to *this* plan. Cross-plan references must qualify with
  the plan id.
- `—` (em dash) renders for a step with no blockers (empty `blocked_by`).

---

## Per-step detail sections

After the table + Legend, each step may have an authored detail section (seeded from the
create-time `detail` field, then owned as body prose):

```markdown
### Step N — {title}

Detailed implementation spec, design notes, or constraints for this step.
```

This prose lives in the body and is **never parsed back into frontmatter** — edit it
freely; it survives saves (the saver regenerates only the table region).

---

## Migrating legacy plans

Plans created before v1.3.0 store their steps only in the body table. They still load
(the loader falls back to a read-only body-parse), but they are not yet frontmatter-native.
Convert them with:

```bash
loom migrate-plan-steps --dry-run   # preview
loom migrate-plan-steps             # apply (idempotent; never empties an unparseable table)
loom migrate-plan-steps <plan-id>   # single doc
```

A plan whose table uses a pre-canonical layout the parser can't read is reported
`unparseable` and left untouched — fix its table by hand, then re-run.
