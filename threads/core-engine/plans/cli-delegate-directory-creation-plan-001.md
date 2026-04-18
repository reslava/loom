---
type: plan
id: cli-delegate-directory-creation-plan-001
title: "Delegate Directory Creation in CLI to Application Layer"
status: draft
created: 2026-04-18
version: 1
tags: [cli, app, refactor]
parent_id: app-layer-refactor-design
target_version: "0.5.0"
requires_load: [app-layer-refactor-design]
---

# Plan — Delegate Directory Creation in CLI to Application Layer

| | |
|---|---|
| **Created** | 2026-04-18 |
| **Status** | DRAFT |
| **Design** | `app-layer-refactor-design.md` |
| **Target version** | 0.5.0 |

---

# Goal

Ensure **all** filesystem directory creation logic resides in the `app` layer, not in the CLI. Currently, `init` and `setup` commands directly call `fs.ensureDirSync` inside the CLI. This creates an inconsistent abstraction and prevents reuse in the VS Code extension.

---

# Steps

| Done | # | Step | Files touched | Blocked by |
|---|---|---|---|---|
| 🔳 | 1 | Update `app/src/init.ts` to handle all directory creation | `app/src/init.ts` | — |
| 🔳 | 2 | Update `app/src/setup.ts` to handle all directory creation | `app/src/setup.ts` | — |
| 🔳 | 3 | Refactor `cli/src/commands/init.ts` to remove direct `fs` calls | `cli/src/commands/init.ts` | Step 1 |
| 🔳 | 4 | Refactor `cli/src/commands/setup.ts` to remove direct `fs` calls | `cli/src/commands/setup.ts` | Step 2 |
| 🔳 | 5 | Run full test suite | All packages | Steps 1‑4 |

---

## Step 1 — Update `app/src/init.ts`

Ensure `initLoom` creates the `.loom/` directory structure internally using the injected `fs` dependency. (This is already implemented; we just verify and remove any remaining CLI‑side directory creation.)

---

## Step 2 — Update `app/src/setup.ts`

Ensure `setupLoom` creates the directory structure internally. (Already implemented.)

---

## Step 3 — Refactor `cli/src/commands/init.ts`

Remove any `fs.ensureDirSync` calls. The `initLoom` use‑case now handles everything.

---

## Step 4 — Refactor `cli/src/commands/setup.ts`

Remove any `fs.ensureDirSync` calls.

---

## Step 5 — Run Tests

```bash
npx ts-node --project tests/tsconfig.json tests/multi-loom.test.ts
```

---

## Legend

| Symbol | Meaning |
|--------|---------|
| ✅ | Done |
| 🔄 | In Progress |
| 🔳 | Pending |
| ❌ | Cancelled |