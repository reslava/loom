---
type: reference
id: rf_01KSG7CNWGYN7XCVCN7XWQFHBN
title: "loom Context Pipeline"
status: active
created: 2026-05-25
version: 1
tags: []
parent_id: null
child_ids: []
requires_load: []
slug: loom-context-pipeline
description: "The Unified Context Pipeline: what it does for the user and how it assembles context internally."
---
# loom Context Pipeline

The **Unified Context Pipeline** is the single piece of Loom that decides *what the AI knows before it acts*. Every time you click a button that launches the AI — reply to a chat, do a plan step, refine a doc — the pipeline gathers the right Loom documents and bakes them into the AI's prompt **before** it runs. The AI never has to go hunting through your project to figure out what's going on; the context is already there.

Source design: `loom/ai-integration/context-pipeline/context-pipeline-design.md`.

---

## Part 1 — The user's point of view

### The problem it removes

Loom's promise is that the AI is *stateful through documents* — it rereads durable docs at every action instead of relying on a fragile memory. In practice that promise used to hold only at session start. The moment you clicked **Reply** on a chat, the AI launched with nothing but the chat file and had to grep your project to reconstruct context — often guessing, sometimes hallucinating, while the very context summary it needed sat unloaded in the sidebar.

The pipeline closes that gap. Context is assembled and injected by Loom itself, not left to the AI's goodwill or to a rule in a config file the AI may never read.

### What you get

- **The AI always knows where it is.** On a chat reply it already has the global context, the weave/thread context, the idea/design/plan it's working under, and any docs those cite — without you pasting anything.
- **No more context dumps.** You stop copy-pasting "for context, here's the project summary…" into chats, and stop saying "implement step 2 of *this* design" while manually opening the design.
- **You see exactly what the AI saw.** Every doc that went into the prompt shows up as a `📄 {Title} — loaded for context` line and is marked in the sidebar CONTEXT section. What the AI got and what you see can never drift apart.
- **You stay in control.** The pipeline runs only when *you* click a button — never in the background, never a surprise mid-conversation. Later phases let you toggle individual docs in/out from the sidebar; your choice always wins over the automatic defaults.
- **Works with any agent.** The context is plain text, so the same pipeline serves Claude Code, Cursor, Continue, or any future MCP-capable agent — not just one vendor.

### When it runs

Any AI-launching action: chat reply, do-step, refine, promote, generate, refresh-ctx. Each action tells the pipeline its *mode* (e.g. a chat reply runs in `chat` mode, a plan step in `implementing` mode), and the mode shapes which reference docs are considered relevant.

---

## Part 2 — How it is designed and works internally

### The shape of the system

```
command (chatReply, doStep, …)
   │  target doc id + mode
   ▼
loom://context/{docId}?mode={mode}     ← MCP resource (the impure boundary)
   │  getState() + read .loom/context-prefs.json
   ▼
assembleContext(targetId, mode, overrides, state)   ← pure function in packages/app
   │  ContextBundle (ordered docs + provenance)
   ▼
serialise → markdown blob → prepended to the AI prompt
            └─ same bundle drives the 📄 visibility lines + sidebar marks
```

There is **one model** — the `ContextBundle` — and three surfaces read from it: the injected prompt, the visibility lines, and the sidebar. They cannot disagree.

### The assembler is a pure function

The heart of the pipeline lives at `packages/app/src/context/assembleContext.ts`:

```ts
assembleContext(
  targetId: string,
  mode: OperationMode,
  overrides: { include: string[]; exclude: string[] },
  state: LoomState,
): ContextBundle
```

No file IO, no async, no VS Code calls. This is possible because `getState()` already loads every document's body into memory (`BaseDoc.content`), so the assembler reads everything it needs from `state` and resolves cross-references through `state.index`. Purity is the design's main lever: the whole behaviour is unit-testable from a hand-built state fixture, and the bundle records *why* each doc was included or excluded — so "why didn't X load?" is always answerable from data, never a mystery about whether the AI followed a rule.

The single impure step — calling `getState()` and reading the prefs file — lives in the MCP resource handler, not in the assembler.

### The ContextBundle

```ts
interface ContextBundle {
  targetId: string;
  mode: OperationMode;
  docs: BundledDoc[];        // ORDERED; serialisation + visibility + sidebar all walk this
  excluded: ExcludedDoc[];   // each with a reason code
  totalTokens: number;
}
```

Each `BundledDoc` carries `id, title, type, scope, reason, content, tokenEstimate`, an optional `stale` marker, and a `missing` flag for a requested doc that doesn't exist. Each `ExcludedDoc` carries a reason: `user-exclude | load_when-filter | stale-skip | budget | missing`.

### The pipeline, step by step

1. **Resolve target** → its weave, thread, and parent chain. The target doc enters the bundle with scope `target`.
2. **Collect auto-load candidates**, each tagged with a scope derived from *where it lives* (scope is positional in Loom — there is no `scope:` frontmatter field): global ctx (`globalDocs`), weave ctx, plus reference docs marked `load: always` in matching scope. *(No thread ctx — a thread's idea/design/plan load in full via the parent chain, so a thread-ctx would duplicate context.)*
3. **Filter by `load_when` vs mode** — a reference relevant to `design` won't load during `implementing`. *(Phase 2 ✅.)*
4. **Add the target's parent chain** — idea → design → plan, as relevant to the mode.
5. **Apply user overrides** from the sidebar: an exclude removes a doc (reason `user-exclude`); an include adds one; an include that overrides an automatic exclude is tracked distinctly. *(Phase 3.)*
6. **Resolve `requires_load` eagerly and transitively** across the target and every emitted doc, with a visited-set so cycles terminate. A `requires_load` id pointing at a missing doc becomes a visible `⚠️ requires_load target missing: <id>` placeholder rather than a silent skip.
7. **Estimate tokens** (heuristic `ceil(chars / 4)` — no tokenizer dependency) and **flag stale docs** using Loom's existing staleness signals.
8. **Apply the token budget.** *(Phase 5; default unlimited until real usage is measured.)*
9. **Return the bundle** in a deterministic order: global ctx → weave ctx → references → parent chain → target → `requires_load` refs. ("Broadest context first, the thing you're working on last, its citations after.")

### Serialisation — why plain markdown

The bundle is serialised into a single markdown blob, one section per doc, each with a one-line provenance header (`### [scope type] Title · id · stale?`) followed by the body, sections split by `---`. This format is deliberately **agent-agnostic**:

- Every agent reads its prompt as text, so markdown is the universal substrate — no parser or schema the agent must support.
- JSON-in-prompt is rejected: it forces the model to decode structure before reading content and couples the bundle to tool-use-capable agents.
- A temp file on disk is rejected: it relies on the agent *choosing* to read the file — a one-shot subprocess never does, which is exactly the failure being fixed.
- Agent-specific instructions ("use the Read tool first") live in the per-command prompt template, never in the bundle, keeping the context portable.

The provenance header line is also the source for the `📄 {Title} — loaded for context` visibility line, which is why the prompt and the visible record can't diverge.

### How it reaches the AI

The MCP resource is the delivery point. It calls `getState()`, reads any per-workspace overrides from `.loom/context-prefs.json` (Phase 3), runs the pure assembler, serialises the result, and returns the markdown. Calling commands prepend that markdown to the prompt before launching the agent. This resource **replaces** the older `loom://thread-context` bundling outright — no legacy path is kept.

It has **two addressing forms**:

- `loom://context/{docId}?mode={mode}` — anchor on a specific document.
- `loom://context/thread/{weaveId}/{threadId}?mode={mode}` — anchor on a thread's primary doc (`design ?? idea ?? active plan ?? first doc`). This is the form thread-level callers use (weave-design / weave-plan / continue-thread / generate / refresh-ctx); chat-reply and do-step use the doc form (`{chatId}` / `{planId}`).

### Operation modes

The mode is explicit, derived from the command: `chatReply → chat`, `doStep → implementing`, `refine* → refine`, `promote(→idea|design|plan)` accordingly, `generate* → idea|design|plan`, `refreshCtx → ctx`. The mode is what makes `load_when` filtering meaningful — filters need a mode to filter against.

### Phased delivery

| Phase | Ships |
|---|---|
| **P1 ✅ shipped** | Core pure pipeline + `loom://context` resource; wired into chat-reply and do-step; auto-load + `requires_load` only; old `thread-context` bundling deleted (zero legacy). |
| **P2 ✅ shipped** | `load_when` filter + the `load: always / by-request` axis. Adds `load` / `load_when` to `ReferenceDoc` and the canonical frontmatter; `load: always` refs auto-load in matching scope, filtered by `load_when` vs the effective mode (`refine` → the target's type); `by-request` (and unset) refs stay reachable only via `requires_load`. Absorbed the `load-when` + `reference-load-context` threads (now archived, Option C). ctx-doc filtering deferred (inert `getState` ctx-load gap); tree-view UX is P3. |
| **P3** | Sidebar CONTEXT UX — interactive include/exclude toggles persisted in `.loom/context-prefs.json`. |
| **P4** | Every remaining AI-launching command routed through the assembler. |
| **P5** | Token budget + summarisation (prefer ctx over source docs, drop oldest done first, never drop user-included). |

### Design invariants

- The assembler stays pure — the impure boundary is the MCP resource, never the function.
- The bundle is the single source of truth for prompt, visibility, and sidebar.
- Context loads only on an explicit user action, never in the background.
- Stale docs are flagged, never silently dropped or rewritten.
- The serialised bundle stays agent-agnostic; nothing Claude-specific leaks into it.

---

## Decisions taken (2026-05-25)

All settled during the design discussion and the Phase 1 build:

1. **Assembler lives in `packages/app`** — pure `(targetId, mode, overrides, state) → ContextBundle`, reusable by CLI and MCP.
2. **`ContextBundle` lives in `packages/core`** — the shared pure data type.
3. **Sidebar prefs → dedicated `.loom/context-prefs.json`** (Phase 3), gitignorable separately from `.loom/settings.json`.
4. **Token budget default: unlimited** (Phase 5) — measure real usage before imposing a default.
5. **`requires_load` resolution is eager + transitive**, cycle-safe via a visited-set.
6. **Missing `requires_load` target → visible placeholder** (`⚠️ requires_load target missing: <id>`) + a diagnostic — never a silent skip.
7. **Serialisation = agent-agnostic markdown** with per-doc provenance headers (not JSON-in-prompt, not a temp file).
8. **Migration = replace immediately, zero legacy** — `loom://thread-context` and `threadContext.ts` were deleted, not aliased; all callers migrated.
9. **Thread addressing form** — `loom://context/thread/{weaveId}/{threadId}` was added to the new resource so thread-level callers (weave-design / weave-plan / continue-thread / generate / refresh-ctx) migrate cleanly without each resolving a target doc. (Approved as the clean, no-legacy path.)
10. **Plan body mini-table removed** — `generatePlanBody` no longer emits the `Created / Status / Design / Target` header table; those live in frontmatter (single source of truth) and the duplicated table only drifted (e.g. a static `Status: DRAFT` left on a done plan).

## Implementation status & known gaps

- **Phase 1 shipped and verified**: build green across all packages; `tests/context-assembler.test.ts` (pure assembler + serialiser) and the MCP integration test both green; a real-repo smoke test assembled the global ctx + Vision + Workflow (via `requires_load` slugs) for a live chat.
- **ctx scope is global + weave (shipped — `core-engine/ctx-load`).** ctx docs are flat `ctx.md` files — `loom/ctx.md` (global, id `loom-ctx`) and `loom/{weave}/ctx.md` (weave, id `{weave}-ctx`) — loaded into `LoomState` by the existing root globs (`getState` → `globalDocs`; `loadWeave` → `looseFibers`) and surfaced by the assembler as `type: ctx`. **There is no thread ctx**: a thread's idea/design/plan already load in full via the parent chain, so a thread-ctx would duplicate context rather than compress it — the assembler's thread-ctx slot was removed. Status derivation (`getWeaveStatus` / `getThreadStatus`) excludes `type === 'ctx'` and `type === 'reference'` from the every-done predicate, so a perpetual ctx never blocks `DONE`. The three ctx writers (`loom_generate_global_ctx`, `loom_summarise`, `loom_refresh_ctx`) all write the canonical flat path with stable ids. *(Consolidating the three generators into one remains a follow-up — blocked on the orthogonal AIClient-vs-MCP-sampling choice.)*
- **Phase 2 shipped.** `load` / `load_when` are now first-class fields on `ReferenceDoc` and in the canonical frontmatter; the pure assembler auto-loads `load: always` refs in matching scope and filters by `load_when` vs the effective mode (`refine` resolves to the target doc's type). `by-request` and unset refs stay reachable only via `requires_load`. The `load-when` and `reference-load-context` threads were absorbed and archived (Option C, 2026-05-27). Verified by `tests/context-assembler.test.ts`.
- **Reference scope labelling (still cosmetic).** `loom/refs/*.md` continue to classify as scope `weave` because `getState` loads `loom/refs/` as a pseudo-weave. Phase 2 added the filter but did *not* reclassify scope; this remains a known cosmetic gap.
