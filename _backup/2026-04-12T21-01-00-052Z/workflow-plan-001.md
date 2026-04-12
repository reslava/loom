---
type: plan
id: workflow-plan-001
title: "Core Engine Implementation"
status: active
created: 2026-04-10
version: 1
tags: [workflow, core, engine]
design_id: workflow-design
target_version: 0.1.0
requires_load: []
---

# Feature — Core Engine Implementation

| | |
|---|---|
| **Created** | 2026-04-10 |
| **Status** | DRAFT |
| **Design** | `workflow-design.md` |
| **Target version** | 0.1.0 |

---

# Goal

Implement the minimal core engine for the document-driven workflow system:
- document types
- reducers (design + plan)
- orchestrator (`applyEvent`)
- derived state functions

This establishes the foundation for filesystem integration and future VSIX/CLI.

---

# Steps

| # | Done | Step | Files touched |
|---|---|---|---|
| 1 | — | Define TypeScript core types | `wf/core/types.ts` |
| 2 | — | Implement design reducer | `wf/core/designReducer.ts` |
| 3 | — | Implement plan reducer | `wf/core/planReducer.ts` |
| 4 | — | Implement applyEvent orchestrator | `wf/core/applyEvent.ts` |
| 5 | — | Implement derived state functions | `wf/core/derived.ts` |
| 6 | — | Basic tests / usage example | `wf/core/test.ts` |

---

## Step 1 — Define TypeScript core types

Create base document types:
- BaseDoc
- DesignDoc
- PlanDoc
- Feature aggregate

Ensure alignment with markdown frontmatter structure.

---

## Step 2 — Implement design reducer

Implement state transitions:
- draft → active → closed → done
- cancel
- refine (version++, refined=true)

Ensure reducer is pure.

---

## Step 3 — Implement plan reducer

Implement:
- activate → implementing → done
- step tracking
- blocked / unblock
- mark stale

Ensure step logic updates status correctly.

---

## Step 4 — Implement applyEvent orchestrator

Single entry point:
applyEvent(feature, event)

Responsibilities:
- route events
- update correct document
- handle cross-effects (refine → mark plans stale)

---

## Step 5 — Implement derived state functions

Functions:
- getFeatureStatus(feature)
- getFeaturePhase(feature)

Derived only from documents.

---

## Step 6 — Basic tests / usage example

Create a simple script that:
- creates a feature in memory
- applies events
- logs resulting state

Used as validation of architecture.
