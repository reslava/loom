---
type: ref
id: workflow
title: "Loom — Workflow"
status: active
created: 2026-04-30
version: 1
tags: [workflow, loop, phases, onboarding]
parent_id: null
child_ids: []
requires_load: [vision]
---

# Loom — Workflow

The Loom loop. One sentence:

`chat → {generate|refine} idea/design/plan/ctx → {implement step(s)} → done`

Diagram:

```
              ┌──────────┐
              │   chat   │   thinking surface (no formal artifacts)
              └────┬─────┘
                   │ {generate}
                   ↓
       ┌──────┬───────┬──────┬──────┐
       ↓      ↓       ↓      ↓      │
     idea   design   plan   ctx     │
       ↑      ↑       │      ↑      │ {refine}  (any doc, any time)
       └──────┴───────┼──────┘      │
                      │             │
                      │  {implement step(s)}
                      ↓             │
                    done            │
                                    │
       any of {idea, design, plan, ctx} ←┘
```

## Phases

### chat (the thinking surface)

Free-form conversation between user and AI, recorded in `*-chat.md` docs. No formal artifacts, no state changes. Lives at any level — weave, thread, attached to a design or plan.

Chat is where things get figured out *before* they get formalized. When the user clicks no button, only chat happens.

### {generate} (chat → structured doc)

User clicks a button: *Generate Idea*, *Generate Design*, *Generate Plan*, *Generate Ctx*. AI reads the relevant chat (or thread context) and produces a draft of the new doc with proper Loom frontmatter and content. User reviews; the doc starts in `status: draft`.

Outputs:
- **idea** — what we want to build, why it matters, success criteria.
- **design** — how we'll build it: architecture, components, decisions, trade-offs.
- **plan** — concrete steps with files touched and dependencies.
- **ctx** — context summary for AI (weave-level, thread-level), auto-loaded.

### {refine} (existing doc → updated doc)

User clicks *Refine* on a doc that has gone stale because its parent (or a sibling) changed. AI reads the updated parents and rewrites or patches the doc. Version bumps.

Common triggers:
- Idea changed → design and plans go stale.
- Design refined → plans go stale.
- Plan steps reworded → ctx may go stale.

Refine is the *staleness collector* of the system. Specs propagate through refine.

### {implement step(s)} (plan → code + done record)

User clicks *DoStep* on a plan in `status: implementing`. AI:

1. Reads the next pending step + thread context (via `loom_do_step` brief).
2. Implements the step using its tools (file edits, builds, etc.).
3. Records what was done in `{plan-id}-done.md` (via `loom_append_done`).
4. Marks the step ✅ in the plan (via `loom_complete_step`).

The user watches in a terminal, can interrupt, can ask follow-ups. Inference happens in a real agent loop where tools exist — not via a captive text-completion call.

### done

Plan terminal state. All steps ✅. `{plan-id}-done.md` is the permanent implementation record. Thread can move to a new plan or close.

## Transitions

| From → To | Trigger | Artifact change |
|-----------|---------|-----------------|
| chat → idea/design/plan/ctx | user clicks *Generate* | new doc, status `draft` |
| draft → active | user clicks *Finalize* / *Start* | status update, no content change |
| active plan → implementing | user clicks *Start Plan* | plan status update |
| implementing plan → done | last step ✅ | plan status auto-updates |
| any doc → updated doc | user clicks *Refine* | content rewrite, version bump |
| plan step ⬜ → ✅ | implement-step succeeds | step marked, done.md appended |

## What is NOT a phase

- **Loading context.** Reading `loom://thread-context`, ctx files, or `requires_load` docs is preparation for any phase, not a phase itself.
- **CRUD on docs.** Creating empty docs, renaming, archiving, deleting — state operations the user does any time. These involve no AI and are not in the loop.
- **Sessions.** A "session" (Claude Code terminal session, extension activation, etc.) is a delivery container, not a workflow phase. Multiple sessions can advance the same loop.

## Customization (future)

A `.loom/workflow.yml` may eventually let teams shape their own variation:
- Rename phases (`spec` instead of `idea`, etc.).
- Add custom phase transitions (e.g. `review` step between `plan` and `implementing`).
- Configure which buttons are available at which phase.

For now, the loop above is canonical.
