---
type: reference
id: rf_01KWKPVD7QE39SSNBSVMAA2H1Z
title: "API naming"
status: active
created: 2026-07-03
version: 1
tags: []
parent_id: null
child_ids: []
requires_load: []
slug: api-naming
description: "Naming convention for Loom's API — parameter and function names must be unambiguous; ban *Id for references (use *Ulid), *Slug for folder names, canonical ULID per entity except weave, snake_case at the MCP boundary + camelCase in the app."
---
## Governing principle — act as the final consumer

The primary consumer of the `loom_*` API is a **language model reasoning from the parameter name alone**. A name is correct only if that consumer can *never* doubt what to fill it with. If there is any ambiguity about whether a value is an identity, a folder name, a title, or a body — the name is wrong.

This is not cosmetics. Ambiguity here is a latent data-corruption bug: the original `threadId`-means-slug defect fabricated a real duplicate thread from a single natural call, because `threadId` *read* as "the ULID" but the code wanted a folder slug. A name that misleads its own author-and-consumer has failed at its one job.

## The rules

1. **A ULID reference parameter is named `*Ulid` — never `*Id`.** `Id` is the offending token: "id" is overloaded (it can read as a slug, a name, a number), so `*Id` leaves the wrong reading open. `*Ulid` names the concrete format (`threadUlid`, `ideaUlid`, `planUlid`, `docUlid`) and cannot be mistaken for a slug. **`*Id` is banned as a reference-param suffix across the whole API.** (Precedent: `setThreadPriority` / `setThreadDeps` already take `threadUlid` and resolve by it — this convention makes the *whole* API consistent with what those already do right.)
   - **Carve-out — structural handles.** `*Id` is banned only where the value is an *entity ULID* or a *folder slug*. A short structural handle that is inherently **neither** — a plan step's `id` (a kebab slug like `loom-patch-doc`), a requirement handle (`IN`/`EX`/`C`) — keeps an explicit `id` / `*_id` (e.g. `step_id`). `step_ulid` would be a lie; `step_slug` implies a folder. These handles are not entity references, so the ambiguity the rule guards against does not arise.

2. **Entity references are strict — the `*Ulid` param accepts the ULID only.** A `*_ulid` never *also* accepts a filename stem or a slug. The name promises exactly one kind of value, so it must accept exactly that. If a slug-keyed operation is genuinely wanted, it is a **separate method or an explicit optional parameter**, never an overloaded second meaning on the same `*_ulid` field. (This retires the old "ULID or filename stem" dual-accept on `plan_ulid` and friends.)

3. **A folder/slug parameter is named `*Slug` — uniform, including `weaveSlug`.** `weaveSlug`, `threadSlug`, `newThreadSlug`. A bare `weave` leaves "fill with what — the object? the name? the slug?" open; `weaveSlug` never does, and its shape teaches that a weave has no ULID.

4. **Every referenceable entity is addressed by its `*Ulid`, except weave, addressed by `weaveSlug`.** This is the single deliberate exception (see below).

5. **Function/tool names are verb + explicit entity, and must describe what the call *does*** (`createThread`, `resolveThreadFolder`). A name that misdescribes its effect is the same class of bug as a mislabelled param. Concretely: `loom_rename` only ever changed a doc's *title* (never its id or file) → renamed **`loom_retitle`**; `loom_rename_doc_file` acts on references only → renamed **`loom_rename_reference_file`**.

## Two surfaces, two casings (D5)

The `*Ulid` / `*Slug` *rules* hold on both surfaces; only the **case** differs by layer, because each layer has its own idiom:

| Surface | Case | Example |
|---|---|---|
| MCP tool schema (external, agent-facing JSON) | **snake_case** | `loom_create_idea(weave_slug, thread_ulid)` |
| App use-case inputs & internal functions (TypeScript) | **camelCase** | `createIdea({ weaveSlug, threadUlid })`, `resolveThreadFolder(weaveSlug, threadUlid)` |

snake_case is the idiomatic MCP convention — it matches the snake_case tool names and the official reference servers (git `repo_path`, GitHub `pull_number`, Slack `channel_id`). camelCase is idiomatic TypeScript. Forcing either across both surfaces de-idiomatizes one of them.

**The boundary maps between them.** Each MCP tool's `handle(root, args)` in `packages/mcp/src/tools/*.ts` reads the snake_case schema args and builds the camelCase app input (today: `args['weaveId']` → `input.weave`). This seam already exists; the convention just names both sides correctly. The mapping may be centralized into one mapper.

## Surfaces and their consumers (which form each surface speaks)

The rules above say how to *name* a value. This says which *form* a surface accepts — decided by **who consumes it**. Three classes:

| Surface class | Primary consumer | Identifier form |
|---|---|---|
| **CLI commands** (`loom <cmd>`) | Human at a terminal | **Slug-first** — a friendly slug / filename stem / entity name; weave args are slugs (a weave *is* a slug). The CLI resolves the friendly reference to a canonical ULID **at its own edge** before calling MCP (e.g. `next.ts` → `resolvePlanUlid`). A ULID-form twin is added only where a real AI/script caller shells out to `loom` — never speculatively. |
| **MCP agent surface** — write-path `loom_*` tools + workflow prompts (`do-next-step`) | AI agent (or the CLI, *after* its edge-resolution) | **Strict ULID** — a `*_ulid` / `planUlid` accepts the ULID and nothing else (rule 2); a stem or title is rejected, not silently resolved. |
| **MCP human-pointable read surface** — context / read resources | Human pointing by file path | **Slug path** — `loom://context/{weaveSlug}/{threadSlug}/{docSlug}`, mirroring how a session opens with `read loom/<weave>/<thread>/chats/chat-001.md`. Slug-in / ULID-out: resolves to canonical ids internally. |

**Why the CLI resolves at its own edge** rather than pushing slugs into MCP: it keeps the agent surface uniformly strict — no tool or prompt ever re-accepts a stem, which is the exact ambiguity rule 2 exists to kill — while the friendly-input convenience lives at the one boundary a human actually touches.

## The weave exception (must stay documented)

A weave has **no ULID** and is addressed by `weaveSlug`. This is deliberate: a weave is currently just a thread-grouping folder, not a Loom document — no manifest, no stable identity, and giving it one now would be overengineering. If rename-survivable weave identity is ever needed, that is a separate, larger idea (a `weave.md` manifest with a `wv_` ULID + migration), out of scope for the naming convention.

## Non-goals

- **The frontmatter `id` field is NOT renamed to `ulid`.** This convention governs the **API surface** — tool params and function names — because that is where a model fills a value from its name, and where the ambiguity bit. The frontmatter `id` is a **storage-schema** field: one identity key per doc, unambiguous in context, and the near-universal primary-key convention. Renaming it would touch every doc + the frontmatter parser + link index for ~zero ambiguity reduction. Deliberately out of scope.

## Quick reference

| Value the param carries | Name it (MCP schema) | Name it (app/TS) | Never |
|---|---|---|---|
| A thread's ULID identity | `thread_ulid` | `threadUlid` | `threadId` |
| An idea/design/plan/doc ULID | `idea_ulid`, `plan_ulid`, `doc_ulid` | `ideaUlid`, `planUlid`, `docUlid` | `*Id` |
| A weave (folder-identified) | `weave_slug` | `weaveSlug` | `weaveId`, bare `weave` |
| A thread folder name (rename/new) | `thread_slug`, `new_thread_slug` | `threadSlug`, `newThreadSlug` | `threadId` |
| A structural handle (step, req) | `step_id`, `IN`/`EX`/`C` | `stepId` | `step_ulid`, `step_slug` |
| Human title | `title` / `new_title` | `title` / `newTitle` | — |
| Markdown body | `content` | `content` | — |

## Where this lives

This is a **citation-loaded** reference — consulted when authoring or reviewing a `loom_*` tool or app use-case, not always-loaded (never placed in `ctx.md`). The hard-rule short-form lives in `CLAUDE.md` (repo-specific — Loom-API authoring — so it carries no `rule:` marker and no `LOOM_CLAUDE_MD` template mirror).
