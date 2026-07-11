---
type: design
id: de_01KX8AACPZR3ZAP15QF74GJCYY
title: Authoring-verb consistency — finish the weave→create/generate sweep
status: done
created: 2026-07-11
version: 1
idea_version: 1
tags: []
parent_id: id_01KX89J3K13JQ37K8CF45P845Z
requires_load: []
---
# Authoring-verb consistency — finish the weave→create/generate sweep

## Design summary

Finish the authoring-verb sweep so **one verb model holds end to end**: *create* = empty/`content`-supplied doc (no AI) · *generate* = AI-authored body · *promote* = linked transform up the chain. This is a **pure naming refactor** — no behavior changes, no aliases, clean cutover. All three gaps below were re-verified against the current tree (not just trusted from the idea).

The one open decision — gap #2, prompt verb — is **resolved: option (a)**. The AI-authoring prompts become `generate-*`, mirroring the `loom_generate_*` tools and the workflow's `{generate}` verb, so the AI-authoring verb reads `generate` everywhere.

## Gap #1 — app use-cases `weave{Idea,Design,Plan}` → `create{Idea,Design,Plan}`

These functions implement **create** (build an empty or `content`-supplied doc; no AI), so the `weave` name is a leftover. Rename files, exports, and the input/deps interfaces; sweep every call site in the same change (API-refactor scope rule). Call sites import by **filename path** (`app/dist/weaveIdea`), so the file rename *is* part of the call-site sweep.

**Rename (file · exported symbol · types):**
| From | To |
|------|----|
| `packages/app/src/weaveIdea.ts` → `weaveIdea` / `WeaveIdeaInput` / `WeaveIdeaDeps` | `createIdea.ts` → `createIdea` / `CreateIdeaInput` / `CreateIdeaDeps` |
| `packages/app/src/weaveDesign.ts` → `weaveDesign` / `WeaveDesignInput` / `WeaveDesignDeps` | `createDesign.ts` → `createDesign` / `CreateDesignInput` / `CreateDesignDeps` |
| `packages/app/src/weavePlan.ts` → `weavePlan` / `WeavePlanInput` / `WeavePlanDeps` | `createPlan.ts` → `createPlan` / `CreatePlanInput` / `CreatePlanDeps` |

**Call sites to sweep (from a full-repo grep):**
- `packages/app/src/index.ts` — the three re-export lines.
- `packages/cli/src/commands/create.ts` — deep imports + call sites.
- MCP tools: `packages/mcp/src/tools/createIdea.ts`, `createDesign.ts`, `createPlan.ts`, `seedExample.ts`, `generate.ts`.
- Other app files that reference these use-cases internally: `req.ts`, `refinePlan.ts`, `refineDesign.ts`, `quickShip.ts`, `promoteToPlan.ts`, `backfillDesignVersions.ts` (verify each; update only real references).
- Tests: `step-crud`, `staleness-baselines`, `req-usecases`, `mcp-read-surface-naming`, `mcp-new-tools`, `design-version-baseline`, `create-with-body`, `create-plan-hardening`, `blockedby-normalization`, `api-contract-refactor`.

Internal hygiene — not model-facing, but it removes the last place the *code* says "weave" for a create. No file-name collisions in `app/` (no existing `create*.ts` there); the MCP-package `tools/createIdea.ts` etc. are a different package and unaffected as filenames.

## Gap #2 — MCP prompts `weave-{idea,design,plan}` → `generate-{idea,design,plan}` (decision **a**)

Model-facing: an agent selects a prompt by name, so these mirror the `{generate}` verb.

- Rename prompt files `packages/mcp/src/prompts/weaveIdea.ts` → `generateIdea.ts` (and `weaveDesign.ts`, `weavePlan.ts`), updating the `name:` field `weave-idea` → `generate-idea` (etc.).
- `packages/mcp/src/server.ts` — import lines (`:83-85`) and the registration list (`:103`): rename import namespaces `weaveIdea`→`generateIdea`, etc.
- Docs: `loom/refs/mcp-reference.md` and `loom/refs/loom-context-pipeline-reference.md` — update the prompt names.
- `loom://catalog` is auto-generated from the live registry — no hand-edit.
- No collision with the `loom_generate_*` **tools**: prompt names and tool names are distinct namespaces; `generate-idea` (prompt) vs `loom_generate_idea` (tool) is exactly the intended mirror.

## Gap #3 — extension labels → single verb `Create`

Command *ids* are already `create*` (welcome links call `command:loom.createWeave`); only the **titles/labels** change. Pick `Create` as the single label verb — mirrors CLI/MCP, overriding the generic VS Code "New X" convention.

**`packages/vscode/package.json` titles:** `New Weave` (:96) → `Create Weave` · `Weave Thread` (:105) → `Create Thread` · `New Idea` (:129) → `Create Idea` · `New Design` (:138) → `Create Design` · `New Plan` (:147) → `Create Plan` · `Weave Chat` (:266) → `Create Chat`. Also the view-welcome link text `[New Weave]` (:65) and the walkthrough `description` `[New Weave]` (:516) → `[Create Weave]`.

**Other extension surfaces:** `packages/vscode/walkthroughs/03-first-weave.md:11` (`New Weave` → `Create Weave`) and `packages/vscode/README.md` (lines ~90-92 `New Idea/Design/Plan`, :137 button table `New Idea / Design / Plan`, :138 `Weave Chat` → `Create Chat`).

## Cross-cutting rules

- **Clean cutover, no aliases** — delete the old names outright (matches Rafa's no-legacy-shim preference).
- **API-refactor scope rule** — every surface that speaks a renamed symbol is swept in the same change; audit by surface (app · MCP tools · MCP prompts · CLI · extension · tests · refs), not by "tools + use-cases".
- `package-old-loom.json` (contains legacy `Assisted Workflow: New Idea` titles) is a retired backup and **out of scope** — flag for separate deletion rather than editing.

## Verification

- `./scripts/build-all.sh` then `./scripts/test-all.sh` — full suite green (the 10 listed tests exercise the renamed app use-cases via `dist`).
- Grep guards: zero `weave{Idea,Design,Plan}` identifiers remain in `packages/**/src` and `tests/**`; zero `weave-{idea,design,plan}` prompt names remain; zero `New `/`Weave ` label verbs remain in the extension's `package.json`/README/walkthrough for these six commands.
- Sanity-check the live MCP surface picks up the renamed prompts after build (the running server is stale until session/MCP restart — expected).

## Success criteria (from the idea)

- No `weave`-as-verb remains for a **create** operation at any layer (app use-cases + extension labels).
- Authoring prompts named `generate-*` consistently across prompt files, `server.ts`, and docs.
- Every call site swept in the same change; no aliases.
- Tests + docs updated; full suite green.

## Non-goals

- `loom_generate_*` / `loom_refine_*` tools stay as-is (already correctly verbed).
- No behavior changes — pure naming.
- The `weave` **noun** (project folder / `Weave` entity) is untouched.
