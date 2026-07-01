---
type: chat
id: ch_01KV4SQTV54S46FAG210S912E8
title: roadmap mcp resource
status: done
created: 2026-06-15
version: 1
tags: []
parent_id: null
requires_load: []
last_ai_block: 4
---
# roadmap mcp resource

## Rafa:

All roadmap feature plans are done, we have CLI commands to use it, but I wonder
Why we did not include (i can not find any) any mcp resource / tool for AI to use roadmap
Would be useful for AI to have MCP resource / tool for roadmap or is enough with CLI?

### Reference document

We have a rule to update documents when we modify related code
I do not remember if we included 
loom/refs/mcp-reference.md
check it, if it is not include yet then add it

update it

## AI:

**Short answer: the roadmap already has an MCP surface — it shipped in Plan-1 (steps 4 & 5, both ✅). What's missing is the *documentation* of it, not the capability.** Your premise ("I can't find any MCP resource/tool for roadmap") is right about the docs and wrong about the code.

### What actually exists today (confirmed in `loom://catalog` + `server.ts`)

- **Read — `loom://roadmap` resource.** `getState → buildRoadmap → RoadmapView` JSON (the single `roadmap[]` order, history, diagnostics). `packages/mcp/src/resources/roadmap.ts`, registered at `server.ts:96` and dispatched at `:154`.
- **Diagnostics.** Cycles / dangling deps / missing-`thread.md` are folded into `loom://diagnostics` and the `validate-state` prompt.
- **Write — three tools.** `loom_create_thread`, `loom_set_priority`, `loom_set_thread_deps` (authored metadata: priority + `depends_on`, with write-time cycle/existence validation). The catalog groups them under **"thread"**, which is probably why they didn't read as "roadmap" when you looked.

So the AI has both **read and write** access to the roadmap via MCP — not just the CLI. This was never a gap; it was the explicit Plan-1 scope (IN4 + IN5 in the req).

### Is CLI enough, or is MCP useful? — MCP is genuinely useful, and it's already the right shape

`loom roadmap` is the **human** ASCII renderer. `loom://roadmap` is what lets an **agent reason about cross-weave blocked-on** (the headline feature) without shelling out and re-parsing CLI text. Both are thin renderers over the one pure `buildRoadmap(state)` — that's the layering working as designed. So: not "is CLI enough" — we correctly have both, for two different consumers.

### The real gap is `loom/refs/mcp-reference.md` — and it's stale well past roadmap

The working-tree diff so far only renamed the title; the body is still 0.4.0-era and wrong in several places:

- No `loom://roadmap`, no `loom://catalog` resources.
- Tool tables miss ~half the live registry (the `req` tools, step-edit tools, `loom_patch_doc`, `loom_do_step`, `loom_read_chat_tail`, the three thread tools, context-prefs…).
- `loom_append_to_chat` is documented as `chatId/role/text` — the real args are `id/body`.
- The generation/sampling tables don't match the catalog.

### Decision before I edit (architecture call — stop rule 3)

A hand-maintained, tool-by-tool table here is **structurally doomed to drift** — which is exactly why `loom://catalog` is auto-generated from the live registry. Two paths:

- **(A) Minimal.** Add the `loom://roadmap` row + the three thread tools to the existing tables. Fast, but the rest of the doc stays wrong and the table keeps drifting.
- **(B) Clean (my lean).** Stop duplicating the registry in prose. Refactor `mcp-reference.md` to explain *concepts* — resources vs tools vs prompts vs sampling, the roadmap surface, the single-AI model — and point at `loom://catalog` as the canonical, always-current tool index, fixing the wrong rows as I pass them. The catalog owns the *list*; the ref owns the *why*. This is the root-cause fix ("fix the generator, not the artifact"), but it's a bigger rewrite of a public ref doc, so I want your call first.

One related thing: `ctx.md` already points at **`architecture-reference.md`** as the home for "all MCP resources/tools/prompts." So part of deciding (B) is whether `mcp-reference.md` and that section should be deduped, or kept distinct (e.g. architecture-ref = surface inventory, mcp-ref = protocol/how-it-works).

Which path do you want — (A), (B), or (B) plus reconciling with `architecture-reference.md`?

## Rafa:

B
for reconciling with `architecture-reference.md` would be this good approach:
- in `architecture-reference.md` how mcp fit in Loom architecture, link to `mcp-reference.md` for mcp details

?

## AI:

Yes — that's the right split, with one addition so we don't just move the drift problem.

Each doc should answer a **different question**, and none should duplicate another:

- **`architecture-reference.md` → WHERE MCP sits.** One section: MCP is the *agent surface* in `cli / vscode → mcp → app → core + fs`, the dependency/injection rules, why the extension talks to MCP instead of `app`. **No** enumerated resource/tool/prompt tables here — just the role + a link to `mcp-reference.md`. (Today it claims to hold "all MCP resources/tools/prompts" — that's the duplication we're removing.)
- **`mcp-reference.md` → HOW MCP works.** Protocol over stdio, host availability (Claude Code vs Loom extension vs Claude-VS-Code-no-MCP), the single-AI model (primary launch-agent vs fallback sampling), and the *categories* of surface — resources vs tools vs prompts vs sampling — explained conceptually, including the roadmap surface (`loom://roadmap` + the three thread write tools) as a worked example.
- **`loom://catalog` → WHAT tools exist right now.** The auto-generated, always-current list. `mcp-reference.md` points here instead of hand-listing every tool.

So the rule of thumb: **architecture-ref = where, mcp-ref = how, catalog = what.** The critical part is that `mcp-reference.md` must *not* re-enumerate the full tool registry either — that's exactly the table that's already stale. It keeps illustrative examples (a couple of tools per category to show shape) and defers the exhaustive list to the catalog. That's what makes this the root-cause fix rather than a one-time re-sync that rots again.

Concretely, I'd:
1. Rewrite `mcp-reference.md` around the how/concepts structure above; replace the exhaustive resource/tool tables with category explanations + a "for the live list, read `loom://catalog`" pointer; fix the wrong bits (`loom_append_to_chat` args, add `loom://roadmap`/`loom://catalog`, the roadmap example); keep `loom_close_plan`/`loom_promote` DeepSeek note only if it's still true (I'll verify against the code first).
2. Trim `architecture-reference.md`'s MCP section to the "where" role + link, removing the enumerated surface tables.
3. Update `ctx.md`'s pointer line so it no longer says architecture-ref holds "all MCP resources/tools/prompts."

These are all `loom/refs/*.md` (+ `ctx.md`), outside the MCP gate, so normal edits. Say `go` and I'll start with step 1.

## AI:

Done — all three, on the **where / how / what** split.

1. **`mcp-reference.md` rewritten (v1 → v2).** Now organised as: how MCP works → host landscape → the four surface kinds. It lists **resources** and **prompts** in full (they're few, stable, and have no catalog of their own) including `loom://roadmap` and `loom://catalog`, but **defers the tool list to `loom://catalog`** — tools are shown only as a grouped overview with one example each + a "read the catalog for exact names/args" pointer. Added a dedicated **roadmap surface** worked example (resource + diagnostics + the three `thread` write tools). Fixed the stale bits: `loom://thread-context` → `loom://context`, and the `loom_promote` AI path (it's inline `body` / sampling now, not DeepSeek — only `loom_close_plan` still uses the DeepSeek `makeAiClient`).
2. **`architecture-reference.md` §2 trimmed.** Replaced the three enumerated Key resources / Key tools / Key prompts lists with a short "the MCP surface has four kinds; this doc owns *where* it sits" paragraph that points at `mcp-reference.md` (how) and `loom://catalog` (what), naming only the three architecture-level entry points (`loom://state`, `loom://context`, `do-next-step`). Diagram, dependency rules, Sampling line, and Context Dispatcher kept.
3. **`ctx.md` pointer fixed** (via `loom_patch_doc`). The §3 "Deeper" line no longer claims architecture-ref holds "all MCP resources/tools/prompts" — it now splits the pointer between architecture-ref (diagram/doc-types/staleness), mcp-ref (surface), and `loom://catalog` (live tools).

**One thing I left alone (your call):** the `loom://thread-context/...` name is also stale in two *other* spots — the agent-integration diagram in `architecture-reference.md` (§2, line ~73) and `ctx.md` §4's "Primary entry points." Both should read `loom://context`. Small correctness fix, but outside the three steps you authorised — want me to sweep those too?

Nothing was built/tested — these are docs only.

## Rafa:

Yes
Also include `mcp-reference.md` in main README `References` section
commit push 