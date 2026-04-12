---
type: plan
id: workflow-plan-004
title: "VSIX MVP (VS Code Extension)"
status: active
created: 2026-04-11
version: 1
tags: [workflow, vsix, vscode, ui]
design_id: workflow-design
target_version: 0.4.0
requires_load: []
---

# Feature — VSIX MVP (VS Code Extension)

| | |
|---|---|
| **Created** | 2026-04-11 |
| **Status** | DRAFT |
| **Design** | `workflow-design.md` |
| **Target version** | 0.4.0 |

---

# Goal

Build a minimal VS Code extension (VSIX) to visualize and interact with the workflow system.

This MVP focuses on:
- feature tree view (like `wf status`)
- basic commands (start plan, refine design)
- reacting to file changes

---

# Steps

| # | Done | Step | Files touched |
|---|---|---|---|
| 1 | — | Setup VSIX project | `extension/` |
| 2 | — | Register extension activation | `extension.ts` |
| 3 | — | Implement FeatureTreeProvider | `views/FeatureTreeProvider.ts` |
| 4 | — | Register Tree View | `package.json` |
| 5 | — | Integrate loadFeature | `core/fs/*` |
| 6 | — | Implement commands | `commands/*` |
| 7 | — | Add file watcher (VS Code API) | `watcher/fileWatcher.ts` |
| 8 | — | Test in VS Code Extension Host | — |

---

## Step 1 — Setup VSIX project

Initialize extension:

- use VS Code extension generator (`yo code`)
- create TypeScript project

Structure:

```

extension/
src/
extension.ts
views/
commands/
watcher/

```

---

## Step 2 — Register extension activation

In `extension.ts`:

- activate on workspace open
- register:
  - tree provider
  - commands
  - watchers

---

## Step 3 — Implement FeatureTreeProvider

Create a Tree View displaying:

```

FEATURES
featureA (ACTIVE)
idea ✔
design ✔
plan-001 ▶ implementing

````

Use:
- `loadAllFeatures`
- `getFeatureStatus`
- `getFeaturePhase`

Each node represents:
- feature
- or document

---

## Step 4 — Register Tree View

In `package.json`:

```json
"contributes": {
  "views": {
    "explorer": [
      {
        "id": "wf.features",
        "name": "Workflow Features"
      }
    ]
  }
}
````

---

## Step 5 — Integrate loadFeature

Reuse filesystem layer from Plan 002.

Ensure:

* works with VS Code workspace root
* uses relative paths
* handles missing files gracefully

---

## Step 6 — Implement commands

Commands:

* `wf.startPlan`
* `wf.refineDesign`

Each command:

* retrieves selected feature / plan
* builds event object
* calls `runEvent`
* refreshes tree view

Example:

```
wf.startPlan(featureId, planId)
```

---

## Step 7 — Add file watcher (VS Code API)

Use:

```ts
vscode.workspace.onDidSaveTextDocument
```

On file change:

* detect featureId
* reload feature
* refresh tree view

This enables:

* live updates
* reactive UI

---

## Step 8 — Test in VS Code Extension Host

Run extension:

* open sample workspace
* verify:

  * tree view renders correctly
  * commands trigger events
  * markdown updates reflect in UI

Validate:

* no crashes on partial data
* correct derived states
* smooth refresh behavior

---

# Notes

This MVP is intentionally minimal.

Focus:

* visibility
* basic interaction
* correctness

---

# Future Improvements

* decorations:

  * ⚠ stale plans
  * 🔴 blocked steps
* inline actions (buttons in tree)
* step-level visualization
* multi-plan comparison
* AI-assisted commands
* integration with chat / Copilot / Codex

---

# Outcome

After this plan, the system becomes:

* a **real developer tool inside VS Code**
* reactive and visual
* aligned with actual workflow usage

This is the first version of:

> an AI-native development environment