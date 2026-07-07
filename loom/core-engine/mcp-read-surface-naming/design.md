---
type: design
id: de_01KWYVRS94S3K18HDRSVPHNE4K
title: Align the MCP read surface to the Slug/Ulid API contract
status: done
created: 2026-07-07
updated: 2026-07-07
version: 5
idea_version: 1
tags: []
parent_id: id_01KWYT8BTZTGT9M6QDF6BDMQ0Z
requires_load: []
---
# Align the MCP read surface to the Slug/Ulid API contract

## Governing principle

Extend the `api-contract-refactor` contract — **ULID reference = `*Ulid`, folder = `*Slug`, `*Id` banned, weave is the slug-only exception** ([api-naming-reference.md](../../refs/api-naming-reference.md)) — to the **read** surface it never audited: MCP resource URI placeholders and prompt args, plus the prompt bodies. Same rule, same "one clean break, no shims" approach.

## Inventory (from the live audit of `packages/mcp/src`)

**Resource URI placeholders** (`server.ts` `RESOURCE_TEMPLATES`):

| Current | → | Corrected | Note |
|---|---|---|---|
| `loom://docs/{id}` | → | `loom://docs/{docUlid}` | ULID canonical; `resolveId` still resolves a slug |
| `loom://context/{docId}` | → | `loom://context/{docUlid}` | same |
| `loom://context/thread/{weaveId}/{threadId}` | → | `loom://context/thread/{weaveSlug}/{threadSlug}` | both segments resolve against folder slugs (already fixed in the human docs) |
| `loom://plan/{id}` | → | `loom://plan/{planUlid}` | |
| `loom://requires-load/{id}` | → | `loom://requires-load/{docUlid}` | |

**Prompt args** (`prompts/*.ts` `promptDef.arguments`):

| Prompt | Current | → | Corrected |
|---|---|---|---|
| `continue-thread`, `weave-idea`, `weave-design`, `weave-plan`, `refine-design` | `weaveId`, `threadId` | → | `weaveSlug`, `threadSlug` |
| `do-next-step` | `planId` | → | `planUlid` (strict: ULID only — the filename dual-accept is retired per naming rule 2; a slug/filename lookup, if wanted, is a separate command/param) |

**Prompt bodies carry stale tool-call guidance** (discovered in audit — wider than naming): e.g. `weave-plan` instructs *"call `loom_create_plan` with `weaveId=` `threadId=` and a `content` body whose Steps table…"* — both the arg names **and** the create-plan contract are obsolete (`loom_create_plan` now takes `weave_slug` + `thread_ulid` + a structured `steps` array, never a `content` table). `weave-design` / `weave-idea` similarly emit `weaveId=`/`threadId=`. These bodies must be rewritten to the current tool contract, or they actively mislead the agent.

## The manifest enhancement (ULID-out)

`assembleContext` currently emits `<!-- loom:context-bundle target=<docUlid> mode=… docs=N tokens~=N -->`. Extend the header to also carry the resolved **thread address** and anchors:

```
<!-- loom:context-bundle target=<docUlid> weave_slug=<slug> thread_ulid=<th_…> mode=… docs=N tokens~=N -->
```

So one context read yields both the reasoning bundle **and** the write-address — a following thread-scoped write (`quick_ship`, `set_priority`, `do_step`) needs no second lookup. The resolver already has the thread in hand when it anchors the primary doc; this just surfaces what it already computed.

## Slug-in (human-pointable)

**Two explicit forms**, each strict about its own input (naming rule 2 — separate forms, never a dual-accept param):
- **ULID form** — `loom://context/{docUlid}` / `loom://plan/{planUlid}` — canonical, AI-internal, ULID only.
- **Slug form** — human-pointable: the thread form `loom://context/thread/{weaveSlug}/{threadSlug}` (exists), plus a path-qualified doc form for doc-by-slug (shape TBD in impl — a bare `{docSlug}` repeats across threads, so it must be qualified, e.g. `loom://context/{weaveSlug}/{threadSlug}/{docSlug}`).

The slug form resolves slug→ULID via the **existing** link index (`resolveId` over `buildLinkIndex`; also surfaced as `loom://link-index`) — we wire existing machinery, not new resolution. This fully satisfies `IN5` (slug addressing available) while keeping the ULID form strict, so no req amend is needed.

## Decisions

- **D1 — doc handle = `{docUlid}`, ULID-strict.** Per naming rule 2 the `{docUlid}` / `{planUlid}` placeholders accept the ULID only (no slug overload). Slug addressing is the separate thread form; a slug/filename convenience, if ever wanted, is a distinct command/param — never a dual-accept on a `*Ulid` placeholder.
- **D2 — prompt-body guidance is in scope.** The naming fix is pointless if the bodies still tell the agent to call renamed tools with dead params. Recommend fixing body guidance in the same change. *(This widens scope beyond pure renaming — flag for confirmation.)*
- **D3 — manifest fields.** Add `weave_slug` + `thread_ulid` + keep `target=<docUlid>`; anchor doc ULIDs optional (only if cheap). Extend the existing comment, don't change the bundle body.
- **D4 — breaking prompt-arg interface.** Renaming prompt args is a breaking change to the MCP prompt schema. Any in-repo caller that invokes a prompt by arg name (audit the VS Code extension) must be updated in the same commit. No alias shims (clean break, per the refactor's philosophy).
- **D5 — resource catalog is out of scope here** → its own thread (`ai-integration/loom-resource-catalog`); this thread only makes the names it will render correct first.

## Verification

- MCP integration test: `loom://context/thread/{weaveSlug}/{threadSlug}` returns a bundle whose manifest header contains `thread_ulid=th_…`; a subsequent `quick_ship` uses it with no extra resolve.
- A guard assertion that no `RESOURCE_TEMPLATES` uriTemplate and no prompt arg name contains the `*Id` token (mirrors the write-surface discipline).
- `build-all` **and an MCP/session restart** are required for a running server to serve the new names (the running server is not hot-reloaded by a build).

## Docs to update (doc-sync contract row 3, same commit)

`mcp-reference.md` (§1 resource table + §3 prompt table), `CLAUDE.md`, `ctx.md`, the `LOOM_CLAUDE_MD` template. The thread-context form in the human docs is already `{weaveSlug}/{threadSlug}`; the `{docId}`/`{planId}` mentions and prompt-arg names still need the sweep.