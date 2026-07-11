---
type: plan
id: pl_01KX859B2QHNPA3BVWCWVVN096
title: Plan B — verb reconciliation (rename/retitle + extension create*)
status: done
created: 2026-07-11
updated: 2026-07-11
version: 1
design_version: 3
tags: []
parent_id: de_01KX84P2MMQTQ32M0WYWBZP9J6
requires_load: []
target_version: 0.1.0
steps:
  - id: cli-rename-retitle
    order: 1
    status: done
    description: Rename the CLI `rename <doc> <new-title>` command to `retitle <doc> <new-title>` (it changes the title, mirroring loom_retitle). Rename commands/rename.ts → retitle.ts + its export, update the registration and description in index.ts. No alias kept.
    files_touched: [packages/cli/src/commands/retitle.ts, packages/cli/src/index.ts]
    blocked_by: []
    satisfies: []
  - id: cli-rename-namespace
    order: 2
    status: done
    description: Add a `loom rename` namespace with `thread <weave> <thread> <new-slug>`, `weave <slug> <new-slug>`, and `reference <slug> <new-slug>` subcommands wrapping loom_rename_thread / loom_rename_weave / loom_rename_reference_file's use-cases (mirrors the `loom create <type>` namespace).
    files_touched: [packages/cli/src/commands/rename.ts, packages/cli/src/index.ts]
    blocked_by: [cli-rename-retitle]
    satisfies: []
  - id: extension-handlers-weave-create
    order: 3
    status: done
    description: "Rename the extension doc-create handlers and their exported functions: weaveIdea.ts→createIdea.ts, weaveDesign.ts→createDesign.ts, weavePlan.ts→createPlan.ts, weaveCreate.ts→createWeave.ts; update the registerCommand ids (loom.createIdea/createDesign/createPlan/createWeave) and imports in extension.ts. Behavior unchanged."
    files_touched: [packages/vscode/src/commands/createIdea.ts, packages/vscode/src/commands/createDesign.ts, packages/vscode/src/commands/createPlan.ts, packages/vscode/src/commands/createWeave.ts, packages/vscode/src/extension.ts]
    blocked_by: []
    satisfies: []
  - id: extension-package-json-manifest
    order: 4
    status: done
    description: "Update package.json for the renamed command ids: commands[] declarations, menus (view/title + context), the view welcome content (command:loom.createWeave), and any walkthrough steps that reference the old loom.weave* ids."
    files_touched: [packages/vscode/package.json]
    blocked_by: [extension-handlers-weave-create]
    satisfies: []
  - id: cli-mcp-parity-test
    order: 5
    status: done
    description: Add a test asserting every non-single-audience loom_* tool has a mirroring CLI command (verb match), so the next drift fails CI. Wire into scripts/test-all.sh. Blocked on Plan A (pl_01KX858NA9H614474WYXQNAQVJ) since it asserts the full surface, plus the CLI rename/retitle changes here.
    files_touched: [tests/cli-mcp-parity.test.ts, scripts/test-all.sh]
    blocked_by: [cli-rename-retitle, cli-rename-namespace, pl_01KX858NA9H614474WYXQNAQVJ]
    satisfies: []
  - id: docs-sweep
    order: 6
    status: done
    description: Refresh packages/cli/README.md (retitle + rename namespace), the extension Marketplace README (packages/vscode/README.md) if it names the weave* buttons, and any WAYS-TO-USE-LOOM references to the renamed verbs.
    files_touched: [packages/cli/README.md, packages/vscode/README.md, docs/WAYS-TO-USE-LOOM.md]
    blocked_by: [cli-rename-retitle, cli-rename-namespace, extension-handlers-weave-create, extension-package-json-manifest]
    satisfies: []
---
# Plan B — verb reconciliation (rename/retitle + extension create*)

## Goal

Reconcile the rename/retitle/create verb space across CLI and extension so no surface uses a verb that lies. On the CLI, the misleading `rename` (which really retitles) becomes `retitle`, freeing `rename` for a `loom rename <thread|weave|reference>` namespace that mirrors the MCP loom_rename_* tools and the `loom create <type>` pattern. In the extension, the `weave{Idea,Design,Plan,Create}` doc-create buttons (verified empty-doc creates, not AI generates) become `create{Idea,Design,Plan,Weave}`. A CLI⇄MCP parity test guards against future drift. Clean cutover — no aliases kept. Intended to land after Plan A (the parity test asserts the full command surface).

---

## Steps

| Done | # | Step | Files touched | Blocked by | Satisfies |
|---|---|---|---|---|---|
| ✅ | 1 | Rename the CLI `rename <doc> <new-title>` command to `retitle <doc> <new-title>` (it changes the title, mirroring loom_retitle). Rename commands/rename.ts → retitle.ts + its export, update the registration and description in index.ts. No alias kept. | packages/cli/src/commands/retitle.ts, packages/cli/src/index.ts | — | — |
| ✅ | 2 | Add a `loom rename` namespace with `thread <weave> <thread> <new-slug>`, `weave <slug> <new-slug>`, and `reference <slug> <new-slug>` subcommands wrapping loom_rename_thread / loom_rename_weave / loom_rename_reference_file's use-cases (mirrors the `loom create <type>` namespace). | packages/cli/src/commands/rename.ts, packages/cli/src/index.ts | cli-rename-retitle | — |
| ✅ | 3 | Rename the extension doc-create handlers and their exported functions: weaveIdea.ts→createIdea.ts, weaveDesign.ts→createDesign.ts, weavePlan.ts→createPlan.ts, weaveCreate.ts→createWeave.ts; update the registerCommand ids (loom.createIdea/createDesign/createPlan/createWeave) and imports in extension.ts. Behavior unchanged. | packages/vscode/src/commands/createIdea.ts, packages/vscode/src/commands/createDesign.ts, packages/vscode/src/commands/createPlan.ts, packages/vscode/src/commands/createWeave.ts, packages/vscode/src/extension.ts | — | — |
| ✅ | 4 | Update package.json for the renamed command ids: commands[] declarations, menus (view/title + context), the view welcome content (command:loom.createWeave), and any walkthrough steps that reference the old loom.weave* ids. | packages/vscode/package.json | extension-handlers-weave-create | — |
| ✅ | 5 | Add a test asserting every non-single-audience loom_* tool has a mirroring CLI command (verb match), so the next drift fails CI. Wire into scripts/test-all.sh. Blocked on Plan A (pl_01KX858NA9H614474WYXQNAQVJ) since it asserts the full surface, plus the CLI rename/retitle changes here. | tests/cli-mcp-parity.test.ts, scripts/test-all.sh | cli-rename-retitle, cli-rename-namespace, pl_01KX858NA9H614474WYXQNAQVJ | — |
| ✅ | 6 | Refresh packages/cli/README.md (retitle + rename namespace), the extension Marketplace README (packages/vscode/README.md) if it names the weave* buttons, and any WAYS-TO-USE-LOOM references to the renamed verbs. | packages/cli/README.md, packages/vscode/README.md, docs/WAYS-TO-USE-LOOM.md | cli-rename-retitle, cli-rename-namespace, extension-handlers-weave-create, extension-package-json-manifest | — |
---

### Legend

| Symbol | Meaning |
|--------|---------|
| ✅ | Done |
| 🔄 | In Progress |
| 🔳 | Pending |
| ❌ | Cancelled |
