---
type: req
id: rq_01KWKFSCTA924FFYPKMTTD0PJT
title: API contract — unambiguous naming + canonical ULID — Requirements
status: locked
created: 2026-07-03
updated: 2026-07-03
version: 2
design_version: 4
tags: []
parent_id: de_01KWKFHSXS96W36BE28VYFG64P
requires_load: []
---
# API contract — unambiguous naming + canonical ULID — Requirements

### ✅ Included

- `IN1` A naming convention documented as `loom/refs/api-naming-reference.md` (citation-loaded reference) plus a hard-rule short-form in `CLAUDE.md`.
- `IN2` Rule: a ULID reference parameter is named `*Ulid` (e.g. `threadUlid`, `ideaUlid`); `*Id` is **banned** as a reference-param suffix across the whole API.
- `IN3` Rule: a folder/slug parameter is named `*Slug` uniformly, **including `weaveSlug`**.
- `IN4` Rule: every referenceable entity is addressed by its `*Ulid` **except weave**, addressed by `weaveSlug` — documented as the single deliberate exception.
- `IN5` A read-only audit: inventory every `loom_*` tool and app use-case parameter, classify each (ULID-ref / slug / title / body / other), and produce a current→proposed rename table covering the whole surface.
- `IN6` A single shared `resolveThreadFolder` resolver as the only ULID→folder chokepoint; an unresolvable `*Ulid` throws.
- `IN7` Explicit thread creation (`createThread → { threadUlid }`); doc-create requires an existing thread referenced by `threadUlid`; the auto-scaffold-into-unknown-thread seam is removed.
- `IN8` One comprehensive breaking refactor applying the convention + canonical ULID resolution across the whole API (create, promote, and folder-op families) in a single pass.
- `IN9` Regression tests: create-by-existing-`threadUlid` lands in that thread; create-by-unknown-`threadUlid` throws; no path fabricates a thread folder.
- `IN10` A release after the refactor.

### ❌ Excluded

- `EX1` A weave ULID or `weave.md` manifest — weave stays a slug-identified grouping folder; rename-survivable weave identity is a separate future idea.
- `EX2` Back-compat shims or deprecation aliases for renamed parameters — clean break (no external users).
- `EX3` Convenience wrappers such as `create_thread_with_idea` — primitives stay clean; composition lives in callers.
- `EX4` Cleanup of the already-orphaned chord-flow duplicate thread — done manually in that repo, not part of this thread.
- `EX5` A sweeping function-signature or return-shape overhaul beyond what the parameter renames and seam removal require.
- `EX6` The interim non-breaking patch — deliberately dropped; the fix ships once, comprehensively.

### ⛓ Constraints

- `C1` Casing is **per surface** (D5): MCP tool-schema params are **snake_case** (`weave_slug`, `thread_ulid`, `new_thread_slug`); app use-case inputs and internal functions are **camelCase** (`weaveSlug`, `threadUlid`, matching the existing `threadUlid`). The `*Ulid`/`*Slug` rules apply on **both** surfaces — only the case differs. Never `*Id` on a reference; never `*ULID`.
- `C2` The `CLAUDE.md` naming rule carries **no `rule:` marker and no `LOOM_CLAUDE_MD` template mirror** — authoring Loom's own API is repo-specific, so it must not enter the CLAUDE.md⇄template sync test.
- `C3` The audit (`IN5`) precedes any code rename — no parameter is renamed before the inventory is complete, since it may surface cases the two known examples don't.
- `C4` The naming reference is citation-loaded (`api-naming-reference.md`) and never placed in `ctx.md`.
- `C5` MCP tool descriptions are updated in lockstep with the renamed parameters so the schemas never describe an old name.
- `C6` The MCP handler (`handle(root, args)` in each `packages/mcp/src/tools/*.ts`) maps snake_case schema args ↔ camelCase app inputs at the boundary; the refactor may centralize this duplicated mapping into one mapper.
