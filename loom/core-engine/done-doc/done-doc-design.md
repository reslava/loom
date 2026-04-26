---
type: design
id: done-doc-design
title: "Done Documents — Post-Plan Implementation Record"
status: draft
created: 2026-04-23
version: 1
tags: [done, plan, implementation-notes, doc-type, close-plan]
parent_id: done-doc-idea
child_ids: []
requires_load: [done-doc-idea]
target_release: "0.2.0"
actual_release: null
---

# Done Documents — Post-Plan Implementation Record

## Goal

Introduce a first-class `done` document type that closes a completed plan with a structured implementation record. The done doc links to its plan via `parent_id` and is loaded by the ctx summariser as a primary source of "what actually happened."

## Design

### Doc type

`type: done` — write-once, no status transitions. Status is always `final`.

File naming: `{plan-id}-done.md`, stored in `weaves/{weave-id}/done/` alongside the moved plan file.

### Frontmatter (canonical)

```yaml
---
type: done
id: {plan-id}-done
title: "Done — {plan title}"
status: final
created: YYYY-MM-DD
version: 1
parent_id: {plan-id}
tags: []
requires_load: []
---
```

### Standard sections (AI fills these)

```markdown
## What was built
<narrative — what the implementation actually delivered, in plain language>

## Steps completed
| # | Step | Notes |
|---|------|-------|
| 1 | description | any deviation from the plan |

## Decisions made
- <decision locked in during implementation that wasn't in the plan>

## Files touched
- `path/to/file.ts` — what changed and why

## Open items
- <new ideas, tech debt, unresolved blockers surfaced during implementation>
```

AI may add extra sections after the standard ones for special cases (migrations, breaking changes, security notes). The standard sections are the floor.

### `closePlan` use-case

`app/src/closePlan.ts`:
- Input: `planId`, optional `notes` string (user additions)
- Loads the weave, finds the plan
- Builds AI messages: system prompt + plan content + completed step list
- Calls `aiClient.complete()` → implementation record body
- Writes the done doc to `done/{plan-id}-done.md`
- Moves the plan file from `plans/{plan-id}.md` to `done/{plan-id}.md`
- Transitions plan status to `done` via `FINISH_PLAN` event
- Returns: `{ donePath, planId }`

### Integration points

- **ctx summariser** (`summarise.ts`): load done docs alongside plans; include "Decisions made" and "Open items" in the summary.
- **Tree view**: done docs appear as a child of their plan node (or under a `Done` section within the plan).
- **`loadWeave`** (`weaveRepository.ts`): scan `done/*-done.md` for done docs; scan `done/*.md` for completed plans. Both populate the weave.

## Decisions

- First-class doc type (not plain markdown) — ensures `parent_id` tracking and ctx summariser access.
- Write-once, `status: final` — no transitions, no reducer needed.
- Lives in `done/` alongside the moved plan — `plans/` stays clean (active work only).
- AI generates the body; user can edit freely afterwards.

## Open questions

- Should the done doc appear in the VS Code tree under the plan node, or in a separate "Done" section?
- Should `closePlan` also mark any remaining undone steps as skipped, or require all steps to be done first?
