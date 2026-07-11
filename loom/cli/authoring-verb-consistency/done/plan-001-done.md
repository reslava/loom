---
type: done
id: pl_01KX8ATQZPZRQRRF3BK275YCPW-done
title: Done — Finish the authoring-verb sweep + chat done status
status: done
created: 2026-07-11
version: 1
tags: []
parent_id: pl_01KX8ATQZPZRQRRF3BK275YCPW
requires_load: []
---
# Done — Finish the authoring-verb sweep + chat done status

## Step 1 — Rename the three app create use-cases and sweep every call site + test in the same step so the build stays green.

Renamed the three app create use-cases `weave{Idea,Design,Plan}` → `create{Idea,Design,Plan}`: `git mv` of `packages/app/src/weaveIdea.ts`/`weaveDesign.ts`/`weavePlan.ts` → `createIdea.ts`/`createDesign.ts`/`createPlan.ts`, plus exports and the `Weave*Input`/`Weave*Deps` interfaces → `Create*Input`/`Create*Deps`. The helper exports `parentDesignVersion`/`parentIdeaVersion`/`PlanStepInput` in createPlan.ts kept their names (not verb-named). Swept every call site: `app/index.ts` re-exports; the sibling app files that import the helpers by path (`req.ts`, `refinePlan.ts`, `refineDesign.ts`, `promoteToPlan.ts`, `backfillDesignVersions.ts` — import path `./weavePlan`→`./createPlan` only) and `quickShip.ts` (path + `weavePlan()`→`createPlan()`); MCP tools `createIdea`/`createDesign`/`createPlan`/`seedExample`/`generate.ts` (deep import path + call + a comment); the CLI `cli/commands/create.ts`; and the 9 app-use-case tests via sed. No aliases — clean cutover.

## Step 2 — Rename the AI-authoring prompts to the generate verb across files, name fields, server registration, and refs.

Renamed the AI-authoring prompts `weave-*` → `generate-*` (decision a). `git mv` `prompts/weaveIdea.ts`/`weaveDesign.ts`/`weavePlan.ts` → `generateIdea.ts`/`generateDesign.ts`/`generatePlan.ts`; changed each `name:` field to `generate-idea`/`generate-design`/`generate-plan` (prompt bodies still reference the `loom_create_*` tools — correct, unchanged). Updated `server.ts` import namespaces + the PROMPTS registration list, `mcp-read-surface-naming.test.ts` (import paths + aliases), and the prompt names in `mcp-reference.md` and `loom-context-pipeline-reference.md`. `loom://catalog` regenerates from the live registry.

## Step 3 — Adopt Create as the single label verb; drop the New/Weave split. Command ids already create*, only titles change.

Adopted `Create` as the single extension label verb. `package.json` titles: `New Weave`→`Create Weave`, `Weave Thread`→`Create Thread`, `New Idea`→`Create Idea`, `New Design`→`Create Design`, `New Plan`→`Create Plan`, `Weave Chat`→`Create Chat`; plus the view-welcome and walkthrough `[New Weave]` links → `[Create Weave]` (command ids were already `create*`). Updated `walkthroughs/03-first-weave.md` and the `vscode/README.md` loop prose + button table. Grep confirms zero `New `/`Weave ` label verbs remain for these six commands.

## Step 4 — Widen the chat status model so `done` is valid (fixes the set_status rejection Rafa hit).

Fixed the chat-status regression: `done` is a valid chat status again. Added `done` to `ChatStatus` (`entities/chat.ts` → `'active' | 'done' | 'archived'`) and to `VALID_STATUSES.chat` (`setStatus.ts`). It's a free label flip (not a guarded transition — DELEGATED untouched); `DocumentStatus` derives from `ChatDoc['status']` so it updated automatically and the tree renders the string unchanged. Extended `tests/set-status.test.ts` (already wired into the suite) to assert chat active/done/archived are all allowed.

## Step 5 — Verify the whole cutover: build all packages, run the full suite, and grep-guard that no old names survive.

Verified the whole cutover. `./scripts/build-all.sh` clean (all packages, CLI relinked); `./scripts/test-all.sh` fully green. Grep guards on source (excluding `dist/`): zero `weave{Idea,Design,Plan}` identifiers in `packages/*/src` + `tests/`, zero `weave-{idea,design,plan}` prompt names, zero old `prompts/weave*` import paths, zero `New `/`Weave ` extension labels for the six commands. Note: the session's running MCP server still advertises the old `weave-*` prompt names until a session/MCP restart — the built dist and source are correct (expected staleness, per the dogfooding note).
