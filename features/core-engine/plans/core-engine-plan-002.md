---
type: plan
id: workflow-plan-002
title: "Filesystem Integration (Markdown Load/Save)"
status: active
created: 2026-04-10
version: 1
tags: [workflow, filesystem, markdown]
design_id: workflow-design
target_version: 0.2.0
requires_load: []
---

# Feature — Filesystem Integration (Markdown Load/Save)

| | |
|---|---|
| **Created** | 2026-04-10 |
| **Status** | DRAFT |
| **Design** | `workflow-design.md` |
| **Target version** | 0.2.0 |

---

# Goal

Connect the core workflow engine to the filesystem using Markdown files as the database.

This includes:
- loading documents from disk
- parsing frontmatter
- saving updated documents
- mapping folder structure to Feature model

This step transforms the system from in-memory logic into a real, persistent workflow engine.

---

# Steps

| # | Done | Step | Files touched |
|---|---|---|---|
| 1 | — | Setup filesystem utilities | `wf/fs/utils.ts` |
| 2 | — | Implement loadDoc (Markdown + frontmatter) | `wf/fs/load.ts` |
| 3 | — | Implement saveDoc (Markdown writer) | `wf/fs/save.ts` |
| 4 | — | Implement loadFeature | `wf/fs/loadFeature.ts` |
| 5 | — | Implement saveFeature | `wf/fs/saveFeature.ts` |
| 6 | — | Integrate with core engine | `wf/runEvent.ts` |
| 7 | — | Test with real feature folder | `features/featureA/*` |

---

## Step 1 — Setup filesystem utilities

Define helpers:
- resolve feature path
- normalize file paths
- ensure directories exist

Base structure:

features/
  feature-id/
    idea.md
    design.md
    plans/
      plan-001.md

---

## Step 2 — Implement loadDoc (Markdown + frontmatter)

Use a library (e.g. gray-matter) to:
- read file
- parse frontmatter
- return object:

{
  ...frontmatter,
  content
}

Ensure compatibility with existing templates.

---

## Step 3 — Implement saveDoc (Markdown writer)

Serialize:
- frontmatter
- content

Write back to disk preserving:
- readability
- consistent formatting

---

## Step 4 — Implement loadFeature

Load:
- idea.md
- design.md
- all plans/*.md

Return Feature object:
{
  idea,
  design,
  plans[]
}

Handle:
- missing files gracefully
- empty plans directory

---

## Step 5 — Implement saveFeature

Persist full feature:
- overwrite idea.md
- overwrite design.md
- write each plan file

Ensure:
- directories exist
- no data loss

---

## Step 6 — Integrate with core engine

Create:

runEvent(featureId, event)

Flow:
1. loadFeature
2. applyEvent
3. saveFeature
4. (optional) run effects

---

## Step 7 — Test with real feature folder

Create a sample feature:

features/featureA/
  idea.md
  design.md
  plans/plan-001.md

Test:
- loading
- applying events
- saving updates

Verify:
- Markdown integrity
- correct state transitions
