---
type: reference
id: rf_01KQYDFDDD7RAN1PW90DJD0B3Q
title: loom — Workflow
status: active
created: "2026-04-30T00:00:00.000Z"
version: 1
tags: [workflow, loop, phases, onboarding, public]
parent_id: null
requires_load: [vision]
slug: workflow
---

# loom — Workflow

The Loom loop. One sentence:

`chat → {generate|refine} idea/design/req/plan/ctx → {implement step(s)} → done`

The authoring chain in order: `chat → idea → design → req → plan → done`. `req` is
**optional** — a thread with no req goes `design → plan` directly.

Diagram:

```
   ┌──────────┐
   │   chat   │   thinking surface (no formal artifacts)
   └────┬─────┘
        │ {generate}
        ↓
   idea ──▶ design ──▶ req ──▶ plan ──▶ done
              └────────────────▶ plan          {implement step(s)}
                                               (req optional: design ▶ plan directly)

   ctx (global + weave) — regenerable scope summary, {generate}/{refresh} any time
   {refine} — re-run generation on any stale idea/design/req/plan, any time
```

## Phases

### chat (the thinking surface)

Free-form conversation between user and AI, recorded in `chat-NNN.md` docs. No formal artifacts, no state changes. Lives at any level — weave, thread, attached to a design or plan.

Chat is where things get figured out *before* they get formalized. When the user clicks no button, only chat happens.

### {generate} (chat → structured doc)

User clicks a button: *Generate Idea*, *Generate Design*, *Generate Req*, *Generate Plan*, *Generate Ctx*. AI reads the relevant chat (or thread context) and produces a draft of the new doc with proper Loom frontmatter and content. User reviews; the doc starts in `status: draft`.

Outputs:
- **idea** — what we want to build, why it matters, success criteria.
- **design** — how we'll build it: architecture, components, decisions, trade-offs.
- **req** — the thread's locked scope: Included / Excluded / Constraints, authored after the design and always-loaded thereafter (optional; see the [requirements model](loom-requirements-reference.md)).
- **plan** — concrete steps with files touched and dependencies, each citing the req it satisfies.
- **ctx** — context summary for AI (global + weave only), auto-loaded by scope.

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
3. Records what was done in `plan-NNN-done.md` (via `loom_append_done`).
4. Marks the step ✅ in the plan (via `loom_complete_step`).

The user watches in a terminal, can interrupt, can ask follow-ups. Inference happens in a real agent loop where tools exist — not via a captive text-completion call.

### done

Plan terminal state. All steps ✅. `plan-NNN-done.md` is the permanent implementation record. Thread can move to a new plan or close.

## Transitions

| From → To | Trigger | Artifact change |
|-----------|---------|-----------------|
| chat → idea/design/req/plan/ctx | user clicks *Generate* | new doc, status `draft` |
| draft → active | user clicks *Finalize* / *Start* | status update, no content change |
| draft req → locked req | user clicks *Finalize Req* | req locked as the thread's scope anchor |
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
