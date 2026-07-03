---
type: design
id: de_01KWKFHSXS96W36BE28VYFG64P
title: API contract — unambiguous naming + canonical ULID
status: done
created: 2026-07-03
updated: 2026-07-03
version: 4
idea_version: 1
tags: []
parent_id: id_01KWKDH801PGWJJCKECP3HZZ2A
requires_load: []
---
# API contract — unambiguous naming + canonical ULID

## Governing principle

**Act as the final consumer.** The primary consumer of the `loom_*` API is a language model reasoning from the parameter name alone. A name passes only if that consumer can *never* doubt what to fill it with. If there is any ambiguity about whether a value is an identity, a folder name, a title, or a body, the name is wrong. Ambiguity here is not cosmetic — it is a latent data-corruption bug (the `threadId`-means-slug case fabricated real data from one natural call).

## The naming convention (deliverable 1)

Four rules, ordered by how often they bite:

1. **A ULID reference parameter is named `*Ulid` — never `*Id`.** `Id` is the offending token: "id" is overloaded in software (it can read as a slug, a name, a number), so `*Id` leaves the door open to exactly the wrong reading. `*Ulid` names the concrete format — `threadUlid`, `ideaUlid`, `planUlid`, `docUlid` — and the consumer cannot mistake it for a slug. **`*Id` is banned as a reference-param suffix across the whole API.**
   - *Precedent, not invention:* `setThreadPriority` / `setThreadDeps` already take `threadUlid` and resolve by it correctly. The refactor makes the *entire* API consistent with the naming those two ops already got right.
   - **Casing is per surface (D5):** MCP tool-schema params are **snake_case** (`thread_ulid`, `weave_slug`, `new_thread_slug`) — the idiomatic MCP convention, matching the snake_case tool names and the official reference servers (git `repo_path`, GitHub `pull_number`). App use-case inputs and internal functions are **camelCase** (`threadUlid`, `weaveSlug`) — idiomatic TS, matching the existing code. The MCP handler maps between them (it already does: `args['weaveId']` → `input.weave`). Never `*Id` on a reference; never `*ULID`.

2. **A folder/slug parameter is named `*Slug` — uniform, including `weaveSlug`.** `weaveSlug`, `threadSlug`, `newThreadSlug`. A bare `weave` leaves "fill with what — the object? the name? the slug?" open; `weaveSlug` never does. As a bonus, the *shape* of the name teaches the model that a weave has no ULID (there is no `weaveUlid`), which is the documented exception below.

3. **Every referenceable entity is addressed by its `*Ulid`, except weave, which is addressed by `weaveSlug`.** This is the one deliberate exception and MUST be documented as such: a weave is currently just a thread-grouping folder, not a Loom document — it has no manifest and no ULID, and giving it one now would be overengineering. If rename-survivable weave identity is ever wanted, that is a separate, larger idea (a `weave.md` manifest with a `wv_` ULID + migration), explicitly out of scope here.

4. **Function names are verb + explicit entity** (`createThread`, `resolveThreadFolder`) so intent is unambiguous at the call site. (Lighter-touch than the param rules; the param rules are where the bug lived.)

**Where the convention lives:** `loom/refs/api-naming-reference.md` (citation-loaded reference — consulted when authoring/reviewing a tool, not always-loaded, per the ctx-vs-reference split). A hard-rule short-form goes in **`CLAUDE.md` only** — authoring Loom's own API is repo-specific (downstream users consume the tools, they don't design them), so **no `LOOM_CLAUDE_MD` template mirror and no `rule:` marker** (it is not a shared rule, so it must not enter the sync test).

## Identity & resolution model (D2 + D4)

- **One resolver, one chokepoint.** A shared `resolveThreadFolder(weaveSlug, threadUlid, deps)` scans thread manifests, maps the `th_` ULID → its folder, and is the single path every tool uses to turn a ULID reference into a filesystem location.
- **Unresolvable = error, never fabricate.** A `threadUlid` that matches no live thread throws. A doc-create never invents a thread.
- **Thread creation is explicit** (removes the auto-scaffold seam — the bug's mechanism):
  ```
  createThread(weaveSlug, threadSlug)       → { threadUlid }         // app layer: camelCase
  loom_create_idea(weave_slug, thread_ulid) → idea into that thread   // MCP surface: snake_case
  ```
  Two calls for "new thread + first doc"; zero ambiguity, no fabrication. The extension composes both behind one button, so the *user* flow is unchanged. No `create_thread_with_idea` convenience — primitives stay clean, composition lives in the caller.

## Audit approach (deliverable 3)

Read-only inventory before any rename. Walk every `loom_*` tool (`packages/mcp/src/tools/*`) and every app use-case (`packages/app/src/*`), and classify each parameter: **ULID-ref / slug / title / body / other**. Produce a table — current name → classification → proposed name → offending? — covering the whole surface, not just the create family. Early known offenders: the create/promote family (`weaveId`, `threadId`) *and* the folder-op family (`loom_rename_thread`'s `weaveId` / `threadId` / `newThreadId` are all `*Id` but all expect slugs). The audit finalizes the convention (rule set may gain cases the two examples didn't show) before the refactor touches code.

## Refactor approach (deliverable 4)

One comprehensive breaking change — no back-compat shims (no external users; a clean break is correct here, not deprecation debt):
1. Rename params across MCP tool schemas + app use-case inputs per the audit table (`*Id`→`*Ulid` for references, `*→*Slug` for folder names).
2. Add the shared `resolveThreadFolder` resolver; route every create/promote/folder-op through it.
3. Remove the `ensureThreadManifest` auto-scaffold-into-unknown-thread seam; thread creation is explicit only.
4. Regression tests: `create_idea(threadUlid=<existing>)` lands in that thread; `create_idea(threadUlid=<unknown>)` throws; no path fabricates a thread folder.
5. Update MCP tool descriptions + the sync-checked doc set as needed; release (breaking → minor/major).

## Decisions log

- **D1 → (c) + `*Ulid`.** Ban `*Id`; ULID refs are `*Ulid` (camelCase, per existing `threadUlid`); folder names are `*Slug` uniformly incl. `weaveSlug`. Chosen by the 100%-clarity test — the consumer must never doubt.
- **D2 → yes / no wrapper.** Explicit `createThread → { threadUlid }`, then doc-create by `threadUlid`. Seam removed.
- **D3 → weave slug-only.** Documented as the single deliberate exception; weave gets no ULID (no overengineering); a weave manifest is a separate future idea.
- **D5 → case per surface.** MCP tool-schema params are snake_case (`weave_slug`, `thread_ulid`); app inputs and internal functions are camelCase (`weaveSlug`, `threadUlid`); the MCP handler maps between them (the seam already exists). Chosen to match the idiomatic MCP convention (reference servers use snake_case params) without de-idiomatizing the TS layer. The `*Ulid`/`*Slug` rules hold on both surfaces; only the case differs.

## Success criteria

- No `loom_*` reference parameter is named `*Id`; ULID refs are `*Ulid`, folder names are `*Slug`.
- Any entity except weave resolves from its `*Ulid`; an unknown/unresolvable `*Ulid` errors instead of fabricating a duplicate.
- Doc-create never creates a thread; thread creation is explicit.
- Regression tests green; the convention is documented (reference + CLAUDE.md hard rule) and the whole API conforms post-audit.
