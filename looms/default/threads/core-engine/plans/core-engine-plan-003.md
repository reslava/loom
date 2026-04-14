---
type: plan
id: workflow-plan-003
title: "CLI Interface (wf command)"
status: active
created: 2026-04-10
version: 1
tags: [workflow, cli, ux]
design_id: workflow-design
target_version: 0.3.0
requires_load: []
---

# Feature — CLI Interface (wf command)

| | |
|---|---|
| **Created** | 2026-04-10 |
| **Status** | DRAFT |
| **Design** | `workflow-design.md` |
| **Target version** | 0.3.0 |

---

# Goal

Provide a command-line interface (CLI) to interact with the workflow system.

This includes:
- viewing feature status (like git status)
- triggering events (runEvent)
- enabling a developer-friendly interface before VSIX

---

# Steps

| # | Done | Step | Files touched |
|---|---|---|---|
| 1 | — | Setup CLI project structure | `cli.ts` |
| 2 | — | Install and configure commander | `package.json` |
| 3 | — | Implement wf status command | `wf/cli/status.ts` |
| 4 | — | Implement loadAllFeatures helper | `wf/cli/loadAllFeatures.ts` |
| 5 | — | Implement status renderer | `wf/cli/status.ts` |
| 6 | — | Implement wf run command | `wf/cli/run.ts` |
| 7 | — | Test CLI with real features | `features/*` |

---

## Step 1 — Setup CLI project structure

Create entry point:

cli.ts

This file registers all commands and parses arguments.

---

## Step 2 — Install and configure commander

Use commander to define commands:

- wf status
- wf run

Ensure CLI can be executed via:

npx ts-node cli.ts status

---

## Step 3 — Implement wf status command

Command:

wf status

Responsibilities:
- load all features
- compute derived state
- print summary

---

## Step 4 — Implement loadAllFeatures helper

Scan:

features/

For each directory:
- call loadFeature
- return list

---

## Step 5 — Implement status renderer

Display:

featureId   STATUS   phase

Then per feature:
- idea
- design
- plans

Use symbols:
✔ done  
▶ implementing  
⚠ blocked  
✖ cancelled  

Optional:
- colors (chalk)

---

## Step 6 — Implement wf run command

Command:

wf run <featureId> <event>

Example:

wf run featureA PLAN_START plan-001

Responsibilities:
- parse input
- map to event object
- call runEvent

---

## Step 7 — Test CLI with real features

Test:
- wf status
- wf run

Verify:
- correct output
- markdown updates
- event flow works end-to-end
