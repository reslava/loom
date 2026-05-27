---
type: design
id: de_01KSG5XTNGXB2KPE448CA5B586
title: Unified Context Pipeline
status: draft
created: "2026-05-25T00:00:00.000Z"
updated: "2026-05-25T00:00:00.000Z"
version: 3
tags: []
parent_id: id_01KSDJ2C59Z1XY11W336B0W9YS
requires_load: []
---
# Unified Context Pipeline

> Design for [[context-pipeline]]. Source: `context-pipeline-idea.md` (open questions settled 2026-05-25). Two items the idea's open-questions list did not cover are decided here: **§5 bundle serialisation** (markdown with provenance headers) and **§7 migration**. Rafa confirmed §7 on 2026-05-25 — **replace immediately, keep zero legacy** (no alias). §5 serialisation rationale explained in chat and stands.

## 1. Scope

**In scope (this thread owns):** the code that takes *(target doc, operation mode, user overrides, loom state)* and produces a deterministic, prompt-ready `ContextBundle` — plus the MCP resource that exposes it and the first two call sites (chat-reply, do-step).

**Consumes (does not re-own):**
- [[showing-docs-loaded]] — the visibility line format. This thread *produces* the data; that thread defines how it's rendered.
- [[load-when]] — the `load_when` filter (Phase 2). The filter logic lives *inside* the assembler but the field design is that thread's.
- [[reference-load-context]] — the `load: always | by-request` axis (Phase 2). Same: gate lives in the assembler, field design is that thread's.

**Non-goals:** background/automatic context loading (pipeline runs only on a button-triggered command), changing how docs are authored, or any model-specific prompt engineering (the bundle is agent-agnostic).

## 2. Grounding in current types

Verified against `packages/core/src/entities`:

- `BaseDoc.content: string` — the raw markdown **body** (frontmatter excluded). So `getState` already loads every doc's body into memory. **The assembler can be genuinely pure and still emit `content` — no IO needed.**
- `LoomState` carries `globalDocs`, `weaves[]` (each with `threads[]`, `looseFibers`, `refDocs`, `allDocs`), and `index: LinkIndex`. Everything the assembler reads is already in state.
- **Scope is positional, not a frontmatter field.** A ctx/ref doc's scope is derived from *where it lives*: `globalDocs` → `global`; a weave's `allDocs`/`looseFibers` → `weave`; a thread's `allDocs` → `thread`. The assembler needs a small `classifyScope(doc, state)` helper; there is no `scope:` key to read.
- `ReferenceDoc` today has `slug` and `loadWhen?: string | null` (reserved, **singular string**) — but **no `load` field**. So:
  - Phase 1 treats all `ctx` docs as implicitly `load: always` and ignores `load_when`.
  - Phase 2 adds the real `load` (enum) and widens `load_when` to `string[]` in the type + frontmatter (coordinated with [[reference-load-context]] and [[load-when]]).
- Staleness signals already exist (plan `design_version`, ctx `source_version`, generation timestamps). The assembler **reuses existing staleness helpers** — it does not reinvent stale detection.

## 3. The `ContextBundle` type

Lives in `packages/core` (pure data type, shared by app + mcp). Final shape:

```ts
type EmitReason   = 'auto' | 'requires_load' | 'user-include' | 'user-exclude-overridden';
type ExcludeReason = 'user-exclude' | 'load_when-filter' | 'stale-skip' | 'budget' | 'missing';
type DocScope     = 'global' | 'weave' | 'thread' | 'target';

interface BundledDoc {
  id: string;
  title: string;
  type: DocumentType;          // existing core type
  scope: DocScope;
  reason: EmitReason;
  content: string;             // body, verbatim from BaseDoc.content
  tokenEstimate: number;
  stale?: { reason: string };  // present only when flagged stale
  missing?: true;              // placeholder for a requires_load target that doesn't exist
}

interface ExcludedDoc {
  id: string;
  reason: ExcludeReason;
}

interface ContextBundle {
  targetId: string;
  mode: OperationMode;
  docs: BundledDoc[];          // ORDERED — serialisation and visibility both walk this in order
  excluded: ExcludedDoc[];
  totalTokens: number;
}
```

`docs[]` is the single ordered list. Serialisation walks it; visibility walks it; the sidebar marks it. One model, three surfaces.

## 4. The assembler

**Location:** `packages/app/src/context/assembleContext.ts` (settled — `packages/app`).

**Signature (pure):**

```ts
function assembleContext(
  targetId: string,
  mode: OperationMode,
  overrides: ContextOverrides,   // { include: string[]; exclude: string[] }
  state: LoomState,
): ContextBundle
```

No IO, no async, no VS Code, no fs. Everything comes from `state` (bodies via `BaseDoc.content`, lookups via `state.index`). This makes the full matrix unit-testable and answers "why didn't X load?" from `bundle.excluded[]` forever.

`OperationMode = 'chat' | 'idea' | 'design' | 'plan' | 'implementing' | 'refine' | 'promote' | 'ctx'`.

### Algorithm (refined from the idea's 9 steps, settled decisions baked in)

```
1. Resolve target → weave, thread, parent chain. Target doc enters docs[] with scope:'target'.
2. Collect auto-load candidates (each tagged with derived scope):
     - global ctx   (globalDocs, type ctx)
     - weave  ctx   (target weave, type ctx)
     - thread ctx   (target thread, type ctx)
     - references with load:always in matching scope   [Phase 2 honours `load`; Phase 1 = all ctx]
3. Filter candidates by load_when vs mode.                [Phase 2; Phase 1 no-op]
4. Add target's parent chain (idea → design → plan as relevant to mode).
5. Apply user overrides: excludes win (move to excluded[] reason 'user-exclude');
   includes add (reason 'user-include'); an include that overrides an auto-exclude → 'user-exclude-overridden'.
6. Resolve requires_load EAGERLY + transitively (settled): walk target + every emitted doc,
   dedupe via a visited set (cycle-safe). Missing target → emit a BundledDoc{missing:true}
   carrying the placeholder text (settled), and push {id, 'missing'} to excluded[] for the diagnostic.
7. Compute tokenEstimate per doc; flag stale via existing staleness helpers.
8. Apply token budget.                                     [Phase 5; Phase 1–4 unlimited (settled)]
9. Return ContextBundle (ordering rule below).
```

**Ordering rule for `docs[]`** (deterministic): global ctx → weave ctx → thread ctx → references → parent chain (idea, design, plan) → target doc → requires_load refs. Stable and explainable; matches the mental model "broadest context first, the thing you're working on last, its citations after."

**Token estimate:** pure heuristic `ceil(chars / 4)` — no tokenizer dependency (keeps the function pure and agent-agnostic). Documented as an estimate, not a billing figure.

## 5. Bundle serialisation

**Decision: a single markdown blob, each doc in its own section with a provenance header line, prepended to the user prompt.** Rationale (the agent-agnostic argument, in full):

- **Every agent reads its prompt as text.** Claude Code, Cursor, Continue, or a raw LLM call all consume a string. Markdown is the universal substrate — no agent needs a parser, a schema, or a capability we can't assume.
- **JSON-in-prompt is rejected:** it asks the agent to parse and trust a structured block, which couples the bundle to tool-use-capable agents and burns tokens on syntax the model has to decode before it can read the content.
- **Temp-file-on-disk is rejected:** it relies on the agent *choosing* to read a file. Agents that don't auto-read (or a one-shot CLI subprocess) miss the context entirely — that is the exact demo bug we're fixing.
- **Agent-specific instructions stay OUT of the bundle.** "Use the Read tool first" or any Claude-ism lives in the per-command prompt *template*, never in the context blob. The bundle is pure, portable context.
- **The provenance header does double duty:** it's also the source for the `📄 X — loaded for context` visibility line ([[showing-docs-loaded]]), so prompt content and visibility output can never diverge.

Layout:

```
<!-- loom:context-bundle target={id} mode={mode} docs={n} tokens~={t} -->

### [global ctx] loom — Global Context  ·  id: loom-ctx
{content}

---

### [thread design] Unified Context Pipeline — Design  ·  id: de_…  ·  ⚠️ stale: design updated after this plan
{content}

---
…
```

The header line per doc carries `[scope type] Title · id · (stale marker?)`. A missing `requires_load` target serialises as `### ⚠️ requires_load target missing: <id>` with no body.

## 6. MCP resource

`loom://context/{docId}?mode={mode}` — read-only. The resource handler:
1. `getState(deps)` (the one impure boundary).
2. Reads overrides from `.loom/context-prefs.json` (Phase 3; Phase 1 = empty overrides).
3. Calls the pure `assembleContext(...)`.
4. Serialises (§5) and returns the markdown text.

This **replaces** `packages/mcp/src/resources/threadContext.ts` outright (today: direct file IO, thread-ctx only, hardcoded section order). Per §7, `loom://thread-context` is **removed**, not aliased — all callers migrate to `loom://context`.

## 7. Migration (settled — replace immediately, zero legacy)

**Decision (Rafa, 2026-05-25): replace the ad-hoc bundling immediately and keep no legacy path — no thin alias, no parallel release.** The assembler is a strict superset of `threadContext.ts` (global+weave+thread ctx, overrides, provenance vs thread-ctx-only), so there is no behaviour to validate side-by-side; a parallel path would only invite drift.

**Phase 1 wires two call sites:**
- **`chatReply`** (extension): before launching the agent, fetch `loom://context/{chatId}?mode=chat`, prepend the serialised bundle to the prompt, print the `📄 …` visibility lines. This is the path that fixes the demo bug.
- **`do-next-step` prompt / `doStep`**: drop its ad-hoc assembly, call the assembler at `mode=implementing`.

**Removal checklist — `loom://thread-context` and `threadContext.ts` are deleted, and every caller migrates to `loom://context`:**
- `packages/mcp/src/resources/threadContext.ts` — delete; unregister the resource in `server.ts`.
- `do-next-step` prompt (`packages/mcp/src/prompts/doNextStep.ts`) — repoint to the assembler.
- **Both CLAUDE.md surfaces** — repo-root `CLAUDE.md` and the `LOOM_CLAUDE_MD` template in `packages/app/src/installWorkspace.ts`: the "Primary entry points" table and the chat-reply context-injection rules currently name `loom://thread-context/{weave}/{thread}`; both must change to the new resource. (These two files must stay in sync per the repo contract.)
- Any extension code referencing the old resource URI.

No `loom://thread-context` reference survives the Phase 1 PR.

## 8. Operation-mode derivation

Mode is explicit, derived from the command (from the idea, grounded against existing commands):

| Command | Mode |
|---|---|
| `chatReply` (in thread) | `chat` |
| `doStep` / `do-next-step` | `implementing` |
| `refineDesign` / `refineIdea` / `refinePlan` | `refine` |
| `promote(chat → idea)` | `idea` |
| `promote(idea → design)` | `design` |
| `promote(design → plan)` | `plan` |
| `generateIdea` | `idea` |
| `generateDesign` | `design` |
| `generatePlan` | `plan` |
| `refreshCtx` | `ctx` |

`refine` is compound — `load_when` filtering (Phase 2) applies per the *target's* type, not the literal mode string.

## 9. Sidebar prefs storage

**Settled: dedicated `.loom/context-prefs.json`** (not a key in `.loom/settings.json`), so a team can gitignore prefs separately. Schema (per-workspace, keyed by target doc id):

```json
{
  "version": 1,
  "overrides": {
    "<targetDocId>": { "include": ["<docId>", "..."], "exclude": ["<docId>", "..."] }
  }
}
```

The MCP resource reads this file (impure boundary) and passes `{include, exclude}` into the pure assembler. Phase 1–2 ship with this absent → empty overrides. Phase 3 makes the sidebar write it.

## 10. Stale marking

The assembler reuses existing staleness signals (plan `design_version` vs design version; ctx `source_version`/timestamps). A stale included doc gets `stale: { reason }` in its `BundledDoc`; that surfaces (a) in the serialised header (`⚠️ stale: …`) so the AI distrusts it, and (b) in the visibility line / sidebar badge. Stale docs are **flagged, never silently dropped or rewritten** (consistent with Loom's global stale rule).

## 11. Testing strategy

The assembler being pure is the whole point — `tests/context-assembler.test.ts` covers the matrix from a hand-built `LoomState` fixture:
- scope resolution (global/weave/thread/target ordering)
- `requires_load` transitive + cycle (A→B→A terminates)
- missing `requires_load` target → placeholder + `excluded:'missing'`
- override precedence (exclude wins; include-overrides-auto-exclude)
- stale flagging
- `load_when` filter per mode (Phase 2)
- budget eviction order + never-drop-user-included (Phase 5)

Plus one MCP integration test that spawns `loom mcp`, reads `loom://context/{id}?mode=chat`, and asserts the serialised markdown contains the expected provenance headers.

## 12. Phased delivery (confirmed)

| Phase | Ships | Code |
|---|---|---|
| **P1** | core pipeline + chat-reply + do-step; auto-load + `requires_load` only | `core/ContextBundle`, `app/context/assembleContext.ts`, `loom://context` resource, wire `chatReply` + `do-next-step`, **delete** `threadContext.ts` + `loom://thread-context` |
| **P2** | `load_when` filter + `load` axis | add `load`/widen `load_when` to types+frontmatter; step 3 of algorithm |
| **P3** | sidebar CONTEXT UX (user override) | `.loom/context-prefs.json` read/write; sidebar toggles; step 5 |
| **P4** | wire remaining AI commands | refine*/promote*/generate*/refreshCtx all call the assembler |
| **P5** | token budget + summarisation | budget config; eviction (prefer ctx over source, drop oldest done first, never user-included) |

Phase order confirmed against Rafa's "sidebar CONTEXT UX as its own phase" note.

## 13. Open / deferred (not blocking Phase 1)

- **Cross-thread `[[link]]` context** (idea's suggestion): pull a referenced thread's ctx one level deep, opt-in via `link_load`. Deferred — bounded value, unbounded cost risk; revisit after P1.
- **Ctx cache freshness** (auto-regen vs stale-badge): recommend the stale-badge (option b) but it belongs to the ctx/refresh thread, not here. The assembler only *marks* stale; it never regenerates.
- **`continue-thread` / `validate-state` prompts**: do they also route through the assembler? Probably yes in P4; not decided.

## Next

Both flagged calls are settled (§5 serialisation = markdown-with-provenance; §7 migration = replace-immediately, zero legacy). Next artifact is `context-pipeline-plan-001.md` scoped to **Phase 1 only**.