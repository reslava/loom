---
type: idea
id: id_01KSDJ2C59Z1XY11W336B0W9YS
title: Unified Context Pipeline
status: draft
created: "2026-05-24T00:00:00.000Z"
updated: "2026-05-25T00:00:00.000Z"
version: 3
tags: []
parent_id: null
requires_load: []
---
# Unified Context Pipeline

## Problem

Loom's vision promises *"the AI becomes as stateful as it can be — not via memory inside the model, but via durable docs it rereads at every action."* Today this promise is kept only at session start (CLAUDE.md auto-load) and inside the Loom MCP server's `do-next-step` prompt. **Every other AI-launching path is context-blind to varying degrees**, and the chat-reply path is fully context-blind: it launches Claude CLI as a one-shot subprocess with nothing but the chat file path. The AI is forced to grep the project to figure out what's going on — exactly the manual context dump Loom exists to eliminate.

Observed in `j:/loom_demo/loom/demo/web-prices/chats/web-prices-chat-002.md`: AI replied to *"what sections does the landing page have?"* by reading 4 files from disk and pattern-searching, while `demo-ctx.md` sat unloaded in the sidebar's CONTEXT section. The vision-promise feature is rendered but does not run.

### Why the existing design didn't ship the promise

The closed [[context-injection]] thread defined a **behavioral rule** for the AI ("on first chat reply in a thread, load thread context"), enforced via CLAUDE.md and tool-response metadata. That works **only** when:

1. The AI is in an interactive Claude Code session **inside** a Loom-installed project, AND
2. The project's CLAUDE.md is at a location Claude Code auto-loads from, AND
3. The AI honors the rule on every turn.

None of those hold for the extension's chat-reply flow (one-shot CLI subprocess, no Loom-aware CLAUDE.md at the right path), and conditions 1-2 will never hold for non-Claude agents. The result: the rule is documented but not delivered.

The fragmented design surface also doesn't help — context concerns are spread across **four** threads with no owner of the actual loading pipeline:

| Existing thread | Owns |
|---|---|
| [[context-injection]] | When to inject (behavioral rule), MVP done as docs only |
| [[showing-docs-loaded]] | Visibility prefixes (`📄 X — loaded for context`) |
| [[reference-load-context]] | The `load: always / by-request` axis |
| [[load-when]] | The `load_when: [idea, design, plan, implementing]` filter |

Nobody owns *"the code that takes a target doc + operation mode + user overrides and produces the prompt-ready context blob."* This thread does.

## Idea

A **single context-assembly pipeline**, owned server-side (extension + MCP), shared by every command that launches AI. Context arrives **baked into the prompt** before the AI runs. No reliance on the AI loading anything itself; no reliance on CLAUDE.md being read; no reliance on which agent the user runs.

### Inputs

1. **Target doc** — the doc the command operates on (chat for `chatReply`, plan for `doStep`, design for `refineDesign`, etc.). Determines weave and thread.
2. **Operation mode** — `chat | idea | design | plan | implementing | refine | promote | ctx`. Derived from the command name; explicit, not implicit. Drives [[load-when]] filtering.
3. **User overrides** — sidebar CONTEXT section: include/exclude toggles per doc. User's call always wins over auto-load defaults.
4. **`requires_load`** — transitively collected from the target doc and from every auto-loaded doc. Cycle-safe.

### Outputs

A deterministic, ordered `ContextBundle`:

```
ContextBundle = {
  docs: [{ id, title, type, scope, content, tokenEstimate, stale? }],
  totalTokens: number,
  emitted: [{ id, reason: "auto" | "requires_load" | "user-include" | "user-exclude-overridden" }],
  excluded: [{ id, reason: "user-exclude" | "load_when-filter" | "stale-skip" | "budget" }],
}
```

The bundle is the single source of truth for both:
- **Prompt injection** — serialised and prepended to the user prompt before AI launch.
- **Visibility output** — drives the `📄 X — loaded for context` lines per [[showing-docs-loaded]].

If the bundle has 7 docs in it, the user sees 7 visibility lines and the AI gets 7 docs in its prompt. There is exactly one model.

### Pipeline order

```
1. Resolve target doc → weave, thread, parent chain.
2. Collect auto-load candidates:
   - Global ctx (load: always, scope: global).
   - Weave ctx (load: always, scope: weave) matching the target's weave.
   - Thread ctx (load: always, scope: thread) matching the target's thread.
   - References with load: always in matching scope.
3. Filter candidates by load_when against operation mode.
4. Add target doc's parent chain (idea → design → plan as relevant).
5. Apply user overrides from sidebar CONTEXT (excludes win, includes add).
6. Transitively resolve requires_load (with cycle detection).
7. Compute token estimates, flag stale docs.
8. Apply token budget (prefer summaries when over budget — see below).
9. Emit bundle with full provenance.
```

## Phased delivery

Each phase ships a useful slice; later phases extend rather than rework earlier ones.

### Phase 1 — Core pipeline + chat-reply + do-step

- New `packages/app/src/context/assembleContext.ts` pure function.
- `loom://context/{docId}?mode={mode}` MCP resource.
- Wire `chatReply.ts` to fetch and inject before launching Claude.
- Wire `do-next-step` prompt to use the assembler (replaces its current ad-hoc bundling).
- Visibility prefixes per [[showing-docs-loaded]].
- **No** `load_when`, **no** sidebar overrides, **no** token budget yet — auto-load + `requires_load` only.

Outcome: the demo bug is gone; every chat reply and step gets ctx + thread context automatically.

### Phase 2 — `load_when` filter

- Implement the [[load-when]] design inside the assembler (step 3 of the pipeline).
- Reference docs become mode-aware: an `architecture-adr` shows up for design but not implementing, etc.

### Phase 3 — Sidebar CONTEXT UX (user override)

- Sidebar CONTEXT section becomes interactive: toggle include/exclude per doc.
- Toggles persist per-workspace (in `.loom/context-prefs.json` or similar).
- Apply at step 5 of the pipeline.
- Hover/badge shows *why* a doc is loaded (`auto` / `via requires_load` / `user-included`).

### Phase 4 — Wire remaining AI-launching commands

- `refineDesign`, `refineIdea`, `refinePlan`, `promote*`, `generate*`, `refreshCtx`, `generateChatReply`.
- Every AI launch goes through the same assembler. No bespoke context bundling anywhere.

### Phase 5 — Token budget + summarisation

- Per-workspace configurable budget (default e.g. 50k tokens for context).
- When over budget: prefer ctx docs (summaries) over their source docs (designs/plans), drop oldest done docs first, never drop user-included items.
- Emit `excluded[].reason = "budget"` so the user can see what was dropped and why.

## Additional improvements (suggestions)

These are not strictly required for "ctx loading works" but I'd argue strongly for them because they address gaps that compound as Loom scales.

### Stale-context marking

If an included doc is stale (plan's `design_version` < its design's current version, ctx's generation timestamp < a parent's updated timestamp), include a `⚠️ stale: parent X updated after this was written` line in both the visibility output and the injected prompt itself. The AI then knows to treat the doc with appropriate skepticism instead of blindly trusting it.

### Ctx cache freshness

Today, ctx docs go stale silently when their source docs change. Either:
- **(a)** auto-regenerate weave/thread ctx whenever a child of it is refined or completed (cheap if the regen is fast, may be too eager);
- **(b)** mark ctx stale in the sidebar with a regenerate badge (user-driven, no surprise regens).

Recommend **(b)** for MVP — surprise regens during a user's typing session would be jarring. Regenerate-button + visible stale badge gives the user agency.

### Cross-thread context resolution

Today, if a chat in thread A references `[[thread-B]]` or `[[thread-B-design]]`, the AI has no way to know what that means unless it greps. Pipeline could optionally pull the referenced thread's ctx (one level deep — never recursive, to bound cost). Default off; enable via doc frontmatter `link_load: true` or per-link inline syntax.

### Explicit operation-mode derivation

Currently operation mode is implicit (some prompts mention "you are implementing", others don't). Pipeline should require an explicit `mode` argument, derived from the command:

| Command | Mode |
|---|---|
| `chatReply` (in thread) | `chat` |
| `doStep` | `implementing` |
| `refineDesign` / `refineIdea` / `refinePlan` | `refine` (compound — filters apply per target type) |
| `promote(chat → idea)` | `idea` |
| `promote(idea → design)` | `design` |
| `promote(design → plan)` | `plan` |
| `generateIdea` | `idea` |
| `generateDesign` | `design` |
| `generatePlan` | `plan` |
| `refreshCtx` | `ctx` |

This is the missing piece that makes [[load-when]] actually useful — filters need a mode to filter against.

### Provenance & testability

The assembler is a **pure function** (`(targetDoc, mode, overrides, loomState) → ContextBundle`). No IO, no side effects. Unit tests cover the matrix of (scope × load × load_when × overrides × requires_load cycles × staleness). When a user asks *"why didn't X load?"*, the bundle's `excluded[]` array has the answer with a reason code. No more "the AI was supposed to do it but didn't" mystery.

### Visibility consistency across host environments

`📄 X — loaded for context` lines should appear:
- In the Claude Code CLI session (printed by the AI, per current CLAUDE.md rule);
- In the VS Code extension's terminal log (printed by the extension when it injects the bundle);
- In the sidebar CONTEXT section (loaded docs visually marked as "active" for the current operation).

Three surfaces, one bundle, same provenance.

### Non-Claude agent support

Bundle serialisation must be agent-agnostic — plain markdown with clear section breaks. No Claude-specific tool-call hints in the context blob. Agent-specific bits (e.g. "use the Read tool first") live in the per-command prompt template, not in the context bundle. This makes the pipeline equally useful for Cursor, Continue, or any future MCP-capable agent.

## Vision tie-in

| Vision element | What this thread delivers |
|---|---|
| *"The AI becomes as stateful as it can be — not via memory inside the model, but via durable docs it rereads at every action"* | Pipeline runs at every AI launch, not just session start. Stateful **per action**, not just per session. |
| *"User decides when to ask AI to generate or refine"* | Pipeline runs only when the user clicks a button. No background context loading; no surprise context shifts mid-conversation. |
| *"Buttons must do real work, not flip state"* | Chat-reply / DoStep / Refine buttons currently rely on the AI to do half their work (load context). After this thread, the buttons do the loading themselves and only delegate generation to the AI. |
| *"User and AI both always know weaves, threads state"* | Today the user knows (sidebar). The AI doesn't (chat-reply blind). After this: both know, automatically. |

## Manual steps this removes

- User pasting "for context, here's the project ctx: …" into chats.
- User manually opening the design doc and saying "implement step 2 of *this*".
- User re-explaining what `[[thread-X]]` means when the AI hasn't read it.
- User noticing mid-conversation that the AI is hallucinating because the ctx it should have isn't loaded, and starting over.

## Relationship to existing threads

- **Supersedes** [[context-injection]] (chat-reply rule absorbed into pipeline). Mark its plan as "implementation superseded — see context-pipeline".
- **Implements** [[load-when]] as Phase 2 (the filter belongs inside the assembler).
- **Implements** [[reference-load-context]] (the `load: always/by-request` axis is the assembler's auto-load gate).
- **Wires into** [[showing-docs-loaded]] for the visibility output. That thread's design stays valid; this thread is the producer of the data it displays.

## Settled decisions

These were the open questions; Rafa settled them on 2026-05-25. Each is now an input to the design.

1. **Assembler lives in `packages/app`.** Pure function, reusable by both CLI and the MCP resource. The CLI can call it directly (e.g. a future `loom context show` debug command) without going through MCP.
2. **Sidebar CONTEXT prefs storage: dedicated `.loom/context-prefs.json`.** A standalone file (not a key inside `.loom/settings.json`) so a team can gitignore prefs separately from shared settings.
3. **Token budget default: unlimited.** Phase 5 ships with no filtering on by default; we measure real usage first and only introduce a default budget once we see how much real projects load. Premature budgeting is worse than none.
4. **`requires_load` resolution is eager.** Resolve the full transitive set once, serialise once. Deterministic and debuggable; lazy resolution is rejected.
5. **Missing `requires_load` target → visible placeholder.** When a `requires_load` ID points to a non-existent doc, the bundle includes a `⚠️ requires_load target missing: <id>` placeholder (and emits a diagnostic). Silent skip is rejected — the author asked for something specific and must see it's gone.

## Why now

The demo recording exposed a vision-load-bearing feature that doesn't work. Beyond the demo, every Loom user today gets a context-blind AI in chats; the more chats grow, the more this hurts. The four fragmented threads have been sitting at "design done, plan-001 done as docs only" for weeks because no single owner ties them into a working pipeline. This thread is that owner.

## Next

The 5 open questions are settled (above). Design discussion is open in `context-pipeline-design.md` (draft). Review it and react — the design carries flagged calls on the two items the open questions didn't cover: bundle serialisation format and the `do-next-step` migration story.