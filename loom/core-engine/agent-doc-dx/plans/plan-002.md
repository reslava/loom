---
type: plan
id: pl_01KT3FNB25446NP4J0C6YEK9KH
title: "create-with-body: one-call doc body + sampling-free promote"
status: done
created: 2026-06-02
updated: 2026-06-02
version: 1
design_version: 4
tags: []
parent_id: de_01KT3FG3M865N54WBT3Z95T20Y
requires_load: []
target_version: 0.1.0
actual_release: 0.8.0
steps:
  - id: thread-an-optional-content-body-through
    order: 1
    status: done
    description: "Thread an optional content/body through the create use-cases: weaveIdea, weaveDesign, weavePlan (and create_reference). When provided, it replaces the generated stub so the doc is born at version 1 with real content; when omitted, behaviour is unchanged."
    files_touched: []
    blocked_by: []
    satisfies: []
  - id: expose-the-optional-body-arg-on
    order: 2
    status: done
    description: "Expose the optional body arg on the MCP tool schemas: loom_create_idea, loom_create_design, loom_create_plan, loom_create_reference. Update tool descriptions."
    files_touched: []
    blocked_by: []
    satisfies: []
  - id: add-optional-body-to-loom-promote
    order: 3
    status: done
    description: "Add optional body to loom_promote: when body is supplied, skip the samplingAiClient path and write the body directly — this unblocks promote in Claude Code sessions."
    files_touched: []
    blocked_by: []
    satisfies: []
  - id: confirm-finalize-semantics-body-on-create
    order: 4
    status: done
    description: "Confirm finalize semantics: body-on-create stays status: draft (no auto-finalize); draft→active remains the explicit human gate. create_reference stays born active."
    files_touched: []
    blocked_by: []
    satisfies: []
  - id: tests-a-single-create-call-produces
    order: 5
    status: done
    description: "Tests: a single create call produces a doc at version 1 with the provided body; promote with body produces the target doc without invoking sampling."
    files_touched: []
    blocked_by: []
    satisfies: []
---
# create-with-body: one-call doc body + sampling-free promote

## Goal

Collapse the create-shell + update-body two-step into one MCP call, and make loom_promote usable in Claude Code (where server-to-client sampling is blocked) by accepting an inline body.
---

## Steps

| Done | # | Step | Files touched | Blocked by | Satisfies |
|---|---|---|---|---|---|
| ✅ | 1 | Thread an optional content/body through the create use-cases: weaveIdea, weaveDesign, weavePlan (and create_reference). When provided, it replaces the generated stub so the doc is born at version 1 with real content; when omitted, behaviour is unchanged. | — | — | — |
| ✅ | 2 | Expose the optional body arg on the MCP tool schemas: loom_create_idea, loom_create_design, loom_create_plan, loom_create_reference. Update tool descriptions. | — | — | — |
| ✅ | 3 | Add optional body to loom_promote: when body is supplied, skip the samplingAiClient path and write the body directly — this unblocks promote in Claude Code sessions. | — | — | — |
| ✅ | 4 | Confirm finalize semantics: body-on-create stays status: draft (no auto-finalize); draft→active remains the explicit human gate. create_reference stays born active. | — | — | — |
| ✅ | 5 | Tests: a single create call produces a doc at version 1 with the provided body; promote with body produces the target doc without invoking sampling. | — | — | — |
---

### Legend

| Symbol | Meaning |
|--------|---------|
| ✅ | Done |
| 🔄 | In Progress |
| 🔳 | Pending |
| ❌ | Cancelled |
