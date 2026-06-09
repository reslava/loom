---
type: plan
id: pl_01KQYDFDDAY6JJDG6WTXWRR9TW
title: Delegate Directory Creation in CLI to Application Layer
status: done
created: "2026-04-18T00:00:00.000Z"
version: 1
tags: [cli, app, refactor]
parent_id: de_01KQYDFDDA1XV31SK6N64VS0ST
requires_load: [de_01KQYDFDDA1XV31SK6N64VS0ST]
target_version: 0.5.0
steps:
  - id: update-app-src-init
    order: 1
    status: done
    description: Update `app/src/init.ts` to handle all directory creation
    files_touched: ["`app/src/init.ts`"]
    blocked_by: []
    satisfies: []
  - id: update-app-src-setup
    order: 2
    status: done
    description: Update `app/src/setup.ts` to handle all directory creation
    files_touched: ["`app/src/setup.ts`"]
    blocked_by: []
    satisfies: []
  - id: refactor-cli-src-commands-init
    order: 3
    status: done
    description: Refactor `cli/src/commands/init.ts` to remove direct `fs` calls
    files_touched: ["`cli/src/commands/init.ts`"]
    blocked_by: [Step 1]
    satisfies: []
  - id: refactor-cli-src-commands-setup
    order: 4
    status: done
    description: Refactor `cli/src/commands/setup.ts` to remove direct `fs` calls
    files_touched: ["`cli/src/commands/setup.ts`"]
    blocked_by: [Step 2]
    satisfies: []
  - id: run-full-test-suite
    order: 5
    status: done
    description: Run full test suite
    files_touched: [All packages]
    blocked_by: [Steps 1‑4]
    satisfies: []
---

# Delegate Directory Creation in CLI to Application Layer

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

## Steps

| Done | # | Step | Files touched | Blocked by | Satisfies |
|---|---|---|---|---|---|
| ✅ | 1 | Update `app/src/init.ts` to handle all directory creation | `app/src/init.ts` | — | — |
| ✅ | 2 | Update `app/src/setup.ts` to handle all directory creation | `app/src/setup.ts` | — | — |
| ✅ | 3 | Refactor `cli/src/commands/init.ts` to remove direct `fs` calls | `cli/src/commands/init.ts` | Step 1 | — |
| ✅ | 4 | Refactor `cli/src/commands/setup.ts` to remove direct `fs` calls | `cli/src/commands/setup.ts` | Step 2 | — |
| ✅ | 5 | Run full test suite | All packages | Steps 1‑4 | — |
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