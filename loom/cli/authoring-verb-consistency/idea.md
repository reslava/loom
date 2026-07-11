---
type: idea
id: id_01KX89J3K13JQ37K8CF45P845Z
title: Authoring-verb consistency — finish the weave→create/generate sweep
status: done
created: 2026-07-11
version: 1
tags: []
parent_id: null
requires_load: []
---
# Authoring-verb consistency — finish the weave→create/generate sweep

## What we want to build

The `cli-management-command-parity` thread reconciled the *command-surface* verbs (CLI `rename`→`retitle` + `rename` namespace; extension `weave*`→`create*`). But the `weave` verb still lingers **below the command surface**, in the authoring path the parity sweep didn't reach. Close those residual gaps so **one verb model holds end to end**: *create* = empty doc (no AI) · *generate* = AI-authored body · *promote* = linked transform up the chain.

Grounding: verified in-repo during the parity thread — the items below are real, not speculative.

## The pending gaps

### 1. App use-case functions named `weave*` that actually *create*
`packages/app/src/weaveIdea.ts`, `weaveDesign.ts`, `weavePlan.ts` export `weaveIdea` / `weaveDesign` / `weavePlan`, but they implement the **create** operation (build an empty or `content`-supplied doc; no AI). The name is a leftover from when `weave` meant "create+generate" combined. Rename → `createIdea` / `createDesign` / `createPlan` (files + exports), and sweep **every call site in the same change** (API-refactor scope rule): the MCP `loom_create_*` tools, the CLI `create*` commands, and every test that imports them. Internal hygiene — not model-facing, but it removes the last place the *code* says "weave" for a create.

### 2. MCP prompt names `weave-idea` / `weave-design` / `weave-plan` — DECISION NEEDED
These prompts (`packages/mcp/src/prompts/weaveIdea.ts` …, registered in `server.ts`, listed in `loom://catalog`) return a structured prompt that **drafts** a doc via AI — the `{generate}` authoring path. Unlike gap #1 these names are **model-facing** (an agent selects a prompt by name). The open decision:
- **(a) rename → `generate-idea/design/plan`** — mirror the `loom_generate_*` tools and the workflow's `{generate}` verb; the AI-authoring verb is `generate` everywhere.
- **(b) keep `weave-*`** as the deliberate AI-authoring verb. (Earlier we agreed "weave" is fine as *the* generate-verb and not worth *introducing* elsewhere — but here it already exists, so keeping it is defensible, not just inertia.)

This is the one real design decision in the thread; resolve (a)/(b) before touching the prompts. Whichever wins, apply it consistently (prompt names, `server.ts` import vars, `mcp-reference.md`).

### 3. Extension labels — adopt `Create`, drop the `New`/`Weave` split
The command *ids* are already `create*` (done in the parity thread). The *titles* are now a mix: `New Idea/Design/Plan` (set this pass), `New Weave`, and `Weave Thread` / `Weave Chat`. Pick **`Create`** as the single label verb — it mirrors the CLI/MCP command (the tri-surface parity rule's intent), which should override the generic VS Code "New X" convention. Result: `Create Idea/Design/Plan/Weave/Thread/Chat`. Sweep `package.json` command titles + view welcome + walkthrough, and the `vscode/README` button table.

## Why it matters

- **Consumer-facing naming clarity** (gaps #2, #3): an agent or user reasoning from a name shouldn't have to map "weave" → create/generate. This is the API-naming rule — names unambiguous to the final consumer — extended to the prompt + label surfaces the parity thread left behind.
- **One verb model, every layer** — kills the residual "what does `weave` mean here?" ambiguity that the whole parity effort set out to remove.

## Success criteria

- No `weave`-as-verb remains for a **create** operation at any layer (app use-cases + extension labels).
- MCP authoring prompts named per the resolved (a)/(b) decision, consistently across prompt files, `server.ts`, and docs.
- Every call site swept in the same change (API-refactor scope rule); **no aliases** — clean cutover.
- Tests + docs (`mcp-reference.md`, `cli/README`, `vscode/README`) updated; full suite green.

## Non-goals

- The `loom_generate_*` / `loom_refine_*` tools stay as-is — already correctly verbed.
- No behavior changes anywhere — pure naming.
- The `weave` **noun** (project folder / `Weave` entity) is untouched; this is only about `weave`-as-a-*verb*.
