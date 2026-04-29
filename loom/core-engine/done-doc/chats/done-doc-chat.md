---
type: chat
id: done-doc-chat
title: "Done Doc Chat"
status: active
created: 2026-04-23
version: 1
tags: []
parent_id: null
child_ids: []
requires_load: []
---
# CHAT

## Rafa:
- should be -done.md a first class loom doc type? or just a AI makrdown generated ? pros and cons?
The main difference is the frontmatter, for a -done doc could be very simple. parentId is the most important to be linked to the plan.
- We should design the main sections to be filled for AI and also gives AI to datail with different format for special implementations
## AI:

**First-class doc type vs plain AI markdown**

| | First-class (`type: done`) | Plain AI markdown |
|---|---|---|
| **Pros** | Queryable by loom (validate, summarise can load it). Frontmatter enforces `parent_id` link to plan. `loadWeave` picks it up — it appears in tree view. Consistent with the rest of the system. | Zero schema cost. AI just writes a file. No new type to maintain across core/fs/app/vscode. Fast to ship. |
| **Cons** | New type everywhere: entity, reducer/events, file pattern in workflow.yml, tree icon, fs loader. More surface area to keep in sync. | No link index tracking. Can't query "all done docs for this weave". Hard to load in ctx summary. Invisible to validation. |

**Recommendation: first-class, but minimal.** The `parent_id` link is exactly the reason — without it the done doc is an orphan. And if loom can't load it, the ctx summariser can't use it as input. The cost is low: `type: done` needs no events/reducers (it's write-once, never transitions status). Just an entity + fs pattern + tree node.

**Minimal frontmatter:**
```yaml
type: done
id: {plan-id}-done
title: "Done — {plan title}"
status: final         # always, no transitions
created: YYYY-MM-DD
version: 1
parent_id: {plan-id}  # the plan this closes
tags: []
requires_load: []
```

**Proposed sections for AI to fill:**

```markdown
## What was built
<narrative summary — what the implementation actually delivered>

## Steps completed
| # | Step | Notes |
|---|------|-------|
| 1 | ... | any deviation from plan |

## Decisions made
<bullet list — decisions locked in during implementation that weren't in the plan>

## Files touched
<bullet list of files created/modified with one-line description each>

## Open items
<anything surfaced during implementation that needs follow-up — new ideas, tech debt, blockers not resolved>
```

The "Files touched" and "Decisions made" sections are the high-value ones — that's what the ctx summariser should pull from. "Open items" feeds new ideas back into the weave.

For special implementations (e.g. a big refactor, a DB migration) AI can add extra sections freely after the standard ones. The standard sections are the floor, not the ceiling.

Shall I create the `done-doc-design.md` now with this as the starting point?

## Rafa:
- Create design and plan docs
Do you consider this should be next plan? pre MVP?

## AI:

Yes — pre-MVP, and it should be the next plan after the current VS Code work settles. Here is my reasoning:

**Why pre-MVP:**
- `done` docs close the loop on plan execution — without them, a completed plan leaves no record. That's a gap in the core workflow.
- The ctx summariser (`loom.summarise`) currently reads only designs, ideas, and plans. Adding done docs as input makes summaries significantly more accurate.
- It's a small, bounded implementation: one new entity, one `closePlan` use-case, one VS Code command. No events or reducers needed.

**Why not immediately:**
- Step 6 of `vscode-extension-plan-007` covers `loom.closePlan` — it's already planned. The design just needs to be written first so step 6 has something to implement against.

Creating the design and plan now.

## Rafa:
After the plan is done. Loom should move both -plan and -done docs to done/ under weave
Agree?
If so update weaves/core-engine/plans/done-doc-plan-001.md  

## AI:

Agreed. The move keeps `plans/` clean — only active work lives there.

**Final layout after `closePlan`:**
```
weaves/{weave-id}/
  plans/          ← active plans only
  done/
    {plan-id}.md          ← plan file, moved here
    {plan-id}-done.md     ← done doc, written here
```

**Implications carried into the plan:**

- Step 2 (fs loader): scan `done/*.md` for plans with `status: done`; scan `done/*-done.md` for done docs. No need to scan `plans/` for done docs.
- Step 3 (`closePlan`): write done doc to `done/{plan-id}-done.md`, then move plan file from `plans/` to `done/{plan-id}.md`.
- `workflow.yml` file pattern for `plan` must cover `done/` subfolder too (or use `**/*-plan-*.md`).

Updating `done-doc-plan-001.md` now.