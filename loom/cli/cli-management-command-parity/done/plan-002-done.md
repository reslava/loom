---
type: done
id: pl_01KX859B2QHNPA3BVWCWVVN096-done
title: Done — Plan B — verb reconciliation (rename/retitle + extension create*)
status: done
created: 2026-07-11
version: 1
tags: []
parent_id: pl_01KX859B2QHNPA3BVWCWVVN096
requires_load: []
---
# Done — Plan B — verb reconciliation (rename/retitle + extension create*)

## Step 1 — Rename the CLI `rename <doc> <new-title>` command to `retitle <doc> <new-title>` (it changes the title, mirroring loom_retitle). Rename commands/rename.ts → retitle.ts + its export, update the registration and description in index.ts. No alias kept.

Renamed the CLI title-change verb `rename` → `retitle`. Moved the old handler to `packages/cli/src/commands/retitle.ts` (`retitleCommand`, message now "retitled"), and re-registered it as `loom retitle <doc> <new-title>` in index.ts. No alias kept (clean cutover).

## Step 2 — Add a `loom rename` namespace with `thread <weave> <thread> <new-slug>`, `weave <slug> <new-slug>`, and `reference <slug> <new-slug>` subcommands wrapping loom_rename_thread / loom_rename_weave / loom_rename_reference_file's use-cases (mirrors the `loom create <type>` namespace).

Repurposed `packages/cli/src/commands/rename.ts` as the `loom rename` namespace: `thread <weave> <thread> <new-slug>`, `weave <slug> <new-slug>`, `reference <slug> <new-slug>`, wrapping the `renameThread` / `renameWeave` / `renameDocFile` app use-cases (thread slug→ULID resolved at the edge). Registered as a commander sub-namespace mirroring `loom create <type>`.

## Step 3 — Rename the extension doc-create handlers and their exported functions: weaveIdea.ts→createIdea.ts, weaveDesign.ts→createDesign.ts, weavePlan.ts→createPlan.ts, weaveCreate.ts→createWeave.ts; update the registerCommand ids (loom.createIdea/createDesign/createPlan/createWeave) and imports in extension.ts. Behavior unchanged.

Renamed the extension doc-create handlers via `git mv`: weaveIdea/Design/Plan/Create.ts → createIdea/Design/Plan/Weave.ts, and their exported functions weave*Command → create*Command. Updated imports + registerCommand ids (loom.createIdea/createDesign/createPlan/createWeave) in extension.ts. Behavior unchanged (all still call loom_create_*).

## Step 4 — Update package.json for the renamed command ids: commands[] declarations, menus (view/title + context), the view welcome content (command:loom.createWeave), and any walkthrough steps that reference the old loom.weave* ids.

Updated packages/vscode/package.json for the renamed ids across command declarations, menus, view welcome content, and walkthrough (loom.weave* → loom.create*, both quoted and command:-link forms). Also updated the button titles "Weave Idea/Design/Plan" → "New Idea/Design/Plan" to match the existing "New Weave" house style (removes weave-as-verb). JSON re-validated.

## Step 5 — Add a test asserting every non-single-audience loom_* tool has a mirroring CLI command (verb match), so the next drift fails CI. Wire into scripts/test-all.sh. Blocked on Plan A (pl_01KX858NA9H614474WYXQNAQVJ) since it asserts the full surface, plus the CLI rename/retitle changes here.

Added `tests/cli-mcp-parity.test.ts`: enumerates the live tool surface via `loom catalog tools`, scans index.ts for CLI verbs, and asserts every loom_* tool is EITHER mapped to a CLI twin OR a documented single-audience EXCEPTION (agent-only / AI-sampling / req-lifecycle / context-UX / setup). A new unclassified tool fails the test. Also verifies each mapped twin is registered, and that retitle + the rename namespace exist. 59 tools, all classified — green. Wired into test-all.sh.

## Step 6 — Refresh packages/cli/README.md (retitle + rename namespace), the extension Marketplace README (packages/vscode/README.md) if it names the weave* buttons, and any WAYS-TO-USE-LOOM references to the renamed verbs.

Docs sweep: cli/README `rename` row → `retitle` + added `rename thread|weave|reference` rows to the Tree-management table; vscode/README button names "Weave Idea/Design/Plan" → "New Idea/Design/Plan" (walkthrough + button table). WAYS-TO-USE-LOOM had no rename references. Fixed the id-management.test.ts regression (its two `loom rename` calls → `retitle`). Full suite green.
