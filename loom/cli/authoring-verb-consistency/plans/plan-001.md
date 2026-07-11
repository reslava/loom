---
type: plan
id: pl_01KX8ATQZPZRQRRF3BK275YCPW
title: Finish the authoring-verb sweep + chat done status
status: done
created: 2026-07-11
updated: 2026-07-11
version: 1
design_version: 1
tags: []
parent_id: de_01KX8AACPZR3ZAP15QF74GJCYY
requires_load: []
target_version: 0.1.0
steps:
  - id: app-use-cases-weave-create
    order: 1
    status: done
    description: Rename the three app create use-cases and sweep every call site + test in the same step so the build stays green.
    files_touched: [packages/app/src/weaveIdea.ts, packages/app/src/weaveDesign.ts, packages/app/src/weavePlan.ts, packages/app/src/index.ts, packages/cli/src/commands/create.ts, packages/mcp/src/tools/createIdea.ts, packages/mcp/src/tools/createDesign.ts, packages/mcp/src/tools/createPlan.ts, packages/mcp/src/tools/seedExample.ts, packages/mcp/src/tools/generate.ts, "tests/*.test.ts"]
    blocked_by: []
    satisfies: []
  - id: mcp-prompts-weave-generate-decision-a
    order: 2
    status: done
    description: Rename the AI-authoring prompts to the generate verb across files, name fields, server registration, and refs.
    files_touched: [packages/mcp/src/prompts/weaveIdea.ts, packages/mcp/src/prompts/weaveDesign.ts, packages/mcp/src/prompts/weavePlan.ts, packages/mcp/src/server.ts, loom/refs/mcp-reference.md, loom/refs/loom-context-pipeline-reference.md]
    blocked_by: []
    satisfies: []
  - id: extension-labels-create
    order: 3
    status: done
    description: Adopt Create as the single label verb; drop the New/Weave split. Command ids already create*, only titles change.
    files_touched: [packages/vscode/package.json, packages/vscode/walkthroughs/03-first-weave.md, packages/vscode/README.md]
    blocked_by: []
    satisfies: []
  - id: chat-done-status-fix
    order: 4
    status: done
    description: Widen the chat status model so `done` is valid (fixes the set_status rejection Rafa hit).
    files_touched: [packages/core/src/entities/chat.ts, packages/core/src/setStatus.ts, tests/set-status.test.ts]
    blocked_by: []
    satisfies: []
  - id: build-test-and-grep-guards
    order: 5
    status: done
    description: "Verify the whole cutover: build all packages, run the full suite, and grep-guard that no old names survive."
    files_touched: [scripts/build-all.sh, scripts/test-all.sh]
    blocked_by: [app-use-cases-weave-create, mcp-prompts-weave-generate-decision-a, extension-labels-create, chat-done-status-fix]
    satisfies: []
---
# Finish the authoring-verb sweep + chat done status

## Goal

Complete the create/generate/promote verb model across the layers the parity sweep didn't reach, and fix the chat status model so `done` is a valid chat state. Pure naming/model widening — no behavior changes, no aliases, clean cutover. Each step leaves the build green: gap #1 (app rename) lands the file rename and every call site + test together; gaps #2 and #3 are self-contained per surface; the chat-status fix is a small union widening; a final step verifies build + full suite + grep guards. The chat-status fix is orthogonal to the verb sweep and rides along per Rafa's explicit ask; the idea/design (finalized) describe only the verb work.

---

## Steps

| Done | # | Step | Files touched | Blocked by | Satisfies |
|---|---|---|---|---|---|
| ✅ | 1 | Rename the three app create use-cases and sweep every call site + test in the same step so the build stays green. | packages/app/src/weaveIdea.ts, packages/app/src/weaveDesign.ts, packages/app/src/weavePlan.ts, packages/app/src/index.ts, packages/cli/src/commands/create.ts, packages/mcp/src/tools/createIdea.ts, packages/mcp/src/tools/createDesign.ts, packages/mcp/src/tools/createPlan.ts, packages/mcp/src/tools/seedExample.ts, packages/mcp/src/tools/generate.ts, tests/*.test.ts | — | — |
| ✅ | 2 | Rename the AI-authoring prompts to the generate verb across files, name fields, server registration, and refs. | packages/mcp/src/prompts/weaveIdea.ts, packages/mcp/src/prompts/weaveDesign.ts, packages/mcp/src/prompts/weavePlan.ts, packages/mcp/src/server.ts, loom/refs/mcp-reference.md, loom/refs/loom-context-pipeline-reference.md | — | — |
| ✅ | 3 | Adopt Create as the single label verb; drop the New/Weave split. Command ids already create*, only titles change. | packages/vscode/package.json, packages/vscode/walkthroughs/03-first-weave.md, packages/vscode/README.md | — | — |
| ✅ | 4 | Widen the chat status model so `done` is valid (fixes the set_status rejection Rafa hit). | packages/core/src/entities/chat.ts, packages/core/src/setStatus.ts, tests/set-status.test.ts | — | — |
| ✅ | 5 | Verify the whole cutover: build all packages, run the full suite, and grep-guard that no old names survive. | scripts/build-all.sh, scripts/test-all.sh | app-use-cases-weave-create, mcp-prompts-weave-generate-decision-a, extension-labels-create, chat-done-status-fix | — |
---

### Legend

| Symbol | Meaning |
|--------|---------|
| ✅ | Done |
| 🔄 | In Progress |
| 🔳 | Pending |
| ❌ | Cancelled |

<!-- step:app-use-cases-weave-create -->
### Step 1 — App use-cases weave* → create*

Rename files `weaveIdea.ts`/`weaveDesign.ts`/`weavePlan.ts` → `createIdea.ts`/`createDesign.ts`/`createPlan.ts`; rename exports `weaveIdea`/`weaveDesign`/`weavePlan` → `createIdea`/`createDesign`/`createPlan` and the `Weave*Input`/`Weave*Deps` interfaces → `Create*Input`/`Create*Deps`. Update `app/index.ts` re-exports and every deep import path (`app/dist/weaveIdea` → `app/dist/createIdea`). Sweep all call sites: `cli/commands/create.ts`, MCP tools `createIdea`/`createDesign`/`createPlan`/`seedExample`/`generate`, and the sibling app files that reference these use-cases (`req.ts`, `refinePlan.ts`, `refineDesign.ts`, `quickShip.ts`, `promoteToPlan.ts`, `backfillDesignVersions.ts` — update only real references). Update the 10 tests that import them: `step-crud`, `staleness-baselines`, `req-usecases`, `mcp-read-surface-naming`, `mcp-new-tools`, `design-version-baseline`, `create-with-body`, `create-plan-hardening`, `blockedby-normalization`, `api-contract-refactor`. No aliases — delete the old names outright.

<!-- step:mcp-prompts-weave-generate-decision-a -->
### Step 2 — MCP prompts weave-* → generate-* (decision a)

Rename prompt files `weaveIdea.ts`/`weaveDesign.ts`/`weavePlan.ts` → `generateIdea.ts`/`generateDesign.ts`/`generatePlan.ts`; change each `name:` field `weave-idea`/`weave-design`/`weave-plan` → `generate-idea`/`generate-design`/`generate-plan`. Update `server.ts` import namespaces (lines ~83-85) and the registration list (~103): `weaveIdea`→`generateIdea`, etc. Update prompt names in `mcp-reference.md` and `loom-context-pipeline-reference.md`. `loom://catalog` regenerates from the live registry — no hand-edit. Distinct namespace from the `loom_generate_*` tools — `generate-idea` (prompt) mirrors `loom_generate_idea` (tool) by design.

<!-- step:extension-labels-create -->
### Step 3 — Extension labels → Create *

In `package.json` retitle: `New Weave`→`Create Weave` (:96), `Weave Thread`→`Create Thread` (:105), `New Idea`→`Create Idea` (:129), `New Design`→`Create Design` (:138), `New Plan`→`Create Plan` (:147), `Weave Chat`→`Create Chat` (:266); also the view-welcome link text `[New Weave]` (:65) and the walkthrough `description` `[New Weave]` (:516) → `[Create Weave]`. Update `walkthroughs/03-first-weave.md:11` (`New Weave`→`Create Weave`) and `README.md` (~:90-92 New Idea/Design/Plan, :137 button-table `New Idea / Design / Plan`, :138 `Weave Chat`→`Create Chat`). Leave `package-old-loom.json` (retired backup) untouched.

<!-- step:chat-done-status-fix -->
### Step 4 — Chat done status fix

Add `done` to the chat status set: `ChatStatus = 'active' | 'done' | 'archived'` (entities/chat.ts:3) and `chat: ['active', 'done', 'archived']` (setStatus.ts:29). `done` is a free label flip (not a guarded transition — leave DELEGATED untouched). `DocumentStatus` derives from `ChatDoc['status']` so it updates automatically; the tree renders `chat.status` as a plain string (treeProvider.ts:838) so nothing breaks. Add/extend a test asserting `decideSetStatus('chat','done')` returns `{ kind: 'allow' }` (create the test file if none exists; wire it into scripts/test-all.sh).

<!-- step:build-test-and-grep-guards -->
### Step 5 — Build, test, and grep guards

Run `./scripts/build-all.sh` then `./scripts/test-all.sh` — full suite green. Grep guards: zero `weave(Idea|Design|Plan)` identifiers in `packages/**/src` and `tests/**`; zero `weave-(idea|design|plan)` prompt names anywhere; zero `New `/`Weave ` label verbs for the six commands in the extension `package.json`/README/walkthrough. Note the running MCP server is stale until session/MCP restart — expected; the dist-importing tests exercise the renamed code.
