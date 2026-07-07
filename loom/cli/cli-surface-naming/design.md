---
type: design
id: de_01KWZ7AN6458PW3DW3G8EE5WR0
title: Align the CLI surface to the Slug/Ulid API contract
status: done
created: 2026-07-07
updated: 2026-07-07
version: 2
idea_version: 1
tags: []
parent_id: id_01KWYWHSWQH5PMK0HNTASGBJ9K
requires_load: []
---
# Align the CLI surface to the Slug/Ulid API contract

## Vision check

Serves *"loom behaviour matches all surfaces"* and *"works with Claude Code, Cursor, or any MCP-capable agent"* (vision). Removes the manual step of a human/agent **guessing whether a CLI arg wants a slug or a ULID** — the same `*Id`-means-slug ambiguity that once fabricated a duplicate thread from a single natural call. A public surface must never make its consumer doubt what to type.

## Governing model — surfaces have consumers, the consumer picks the identifier form

The `*Ulid`/`*Slug` **rules** (see [api-naming-reference](../../refs/api-naming-reference.md)) are universal. What this thread adds is the **surface layer**: *which form each surface speaks is decided by who consumes that surface.* Three classes:

| Surface class | Primary consumer | Identifier form | Rule |
|---|---|---|---|
| **CLI commands** (`loom <cmd>`) | **Human at a terminal** | **Slug-first** — friendly slug/stem; weave args are slugs (weave *is* a slug). Resolved to a ULID at the CLI edge before any MCP call. | A ULID-form twin exists **only where a real AI/script caller shells out to `loom`** — none identified today, so none is built now. |
| **MCP agent surface** — write-path `loom_*` tools + workflow prompts (`do-next-step`) | **AI agent (or the CLI, post-edge-resolution)** | **Strict ULID** — `*_ulid` accepts the ULID and nothing else. | Already true for every write tool via `requirePlanUlid`. `do-next-step` is the last exception and gets tightened here. |
| **MCP human-pointable read surface** — context/read resources | **Human pointing by file path** | **Slug path** — `loom://context/{weaveSlug}/{threadSlug}/{docSlug}`, mirroring how a session opens with `read loom/cli/cli-surface-naming/chats/chat-001.md`. | Slug-in / ULID-out: a human addresses by the path they can see; the resource resolves to canonical ULIDs internally. |

**Why the CLI resolves at its own edge rather than pushing slugs into MCP:** it keeps the agent surface uniformly strict (no tool ever re-accepts a stem), while the friendly-input convenience lives exactly at the boundary a human touches. The CLI already holds `getState`, so edge-resolution is local and cheap.

## What changes

### A. CLI — internal call sites (correctness, not cosmetics)

Rename every param where a **slug flows through a `*Id`-named variable**, matching the app contract:
- `refine.ts`, `design.ts`, `plan.ts`, etc.: `runEvent(weaveId, …)` → `runEvent(weaveSlug, …)`; the local variable and its source stop calling a weave folder `weaveId`.
- Any `docId` / `planId` locals that actually carry a slug/stem → `*Slug` or resolved-to-`*Ulid` at the point of resolution. No slug may reach a `*Ulid`-named param.

### B. CLI — user-facing args (slug-first)

- Weave-scoped commands are slug-only already (weave has no ULID): `status [weave]`, `validate [weave]`, `design <weave>`, `plan <weave>`, `refine-design <weave>`, `--weave <weave>`. Drop `-id` suffixes from arg *labels*.
- Entity-addressed commands take a **friendly identifier resolved at the edge**: `next [plan]`, `start-plan [plan]`, `complete-step [plan]`, `context [doc]`, `--thread <thread>`. The arg is named for the entity (`[plan]`, `[doc]`, `<thread>`), not `*-id` (a lie) nor `*-ulid` (also a lie at the human boundary).

### C. `next.ts` + the `do-next-step` tightening (the item that opened this thread)

- `next.ts` resolves its friendly `[plan]` arg → a `pl_` ULID at the edge (extend `resolveActivePlanId` into a general `resolvePlanUlid(friendly)` using `getState`), then calls the prompt with a strict `planUlid`.
- **`do-next-step` prompt: swap the tolerant `resolveDocIdOrThrow` (doNextStep.ts:17) for a strict `pl_`-ULID guard** — same contract as the write tools. This closes the "mild rule-2 imperfection" from `core-engine/mcp-read-surface-naming` (its chat-001, line 239): the prompt could stay tolerant only until the CLI thread landed edge-resolution. It has now.

### D. MCP human-pointable read surface

- Confirm/extend the slug-path form of the context resource: `loom://context/{weaveSlug}/{threadSlug}/{docSlug}` as the addressing a human points at (the session-start `read <path>` → `loom://context/<path>` mapping). Verify what `core-engine/mcp-read-surface-naming` already shipped and fill only the gap; do not duplicate.

### E. Documentation — persist the convention "always present" (the *memorize* ask)

- **`loom/refs/api-naming-reference.md`** — add a **"Surfaces and their consumers"** section: the three-class table above. This is the canonical, detailed home; it already contains the `*Ulid`/`*Slug` rules this extends.
- **`loom/ctx.md`** (§3 Architecture) — add a **compact 3–4 line always-present summary**: *CLI = slug/human-first · MCP tools+prompts = strict ULID · MCP context resources = slug-path human-pointable.* api-naming-reference is citation-loaded only, so the always-present copy must live in the global ctx that loads every session — which is exactly what Rafa asked for.
- Sweep the doc-sync row for API surfaces if the short-form in `CLAUDE.md` needs the surface nuance (likely a one-line addition, not a rule marker).

## Decided — migration path: clean break

The idea flagged this as the one call this thread must make: the CLI is a *shipped* public surface, so renaming labels is user-visible. **Decided: clean rename, no deprecation-alias shims.** The old arg/flag names are removed outright, not aliased. Rationale: consistent with the no-legacy-trash stance and the near-zero external-user reality; alias shims are debt that would outlive their audience. Version bump is a minor at most. (The idea's original text leaned toward deprecated aliases for one release — superseded by this decision.)

## Out of scope

- No weave ULID (the documented weave exception stands — weave is slug, full stop).
- No renaming of the frontmatter `id` field (storage schema, not API surface).
- Building speculative ULID CLI twins for callers that don't exist yet.
