---
type: design
id: de_01KQYDFDD9XW7XNAC8VES80FTN
title: MCP doc resolver scope and ID disambiguation
status: done
created: "2026-05-05T00:00:00.000Z"
updated: 2026-05-08
version: 3
tags: []
parent_id: id_01KQYDFDD9W0YYAC3FPN2PAVH0
requires_load: []
---
# MCP doc resolver scope and ID disambiguation — Design

## Problem recap

Two defects in the doc-by-id resolver used by every id-keyed MCP tool:

1. The resolver walks `.md` files outside `loom/**` (observed: `docs/internal/backup/.cursor/rules/.archive/loom.md` matched `id="loom"`).
2. When multiple files match an id, one is silently picked.

See [mcp-doc-resolver-scope-idea](mcp-doc-resolver-scope-idea.md) for the full motivation. This doc covers *how* to fix it.

## Where the resolver lives

To be confirmed during implementation, but most likely in `packages/fs/` — either `linkRepository.ts` (the link index walks all docs to build parent/child graph) or a dedicated `findDoc` helper used by `app/` use-cases. The MCP tools layer in `packages/mcp/` calls into `app/`, which calls into `fs/`. The fix lives at the lowest layer that knows about file paths — `fs/`.

The link index built by `buildLinkIndex` is the single source of truth for "doc with id X exists at path Y." Every id-keyed lookup eventually reads this index.

## Two things to fix, two design decisions

### 1. Scope — where does the resolver look?

**Recommendation: allowlist `loom/**`, ignore everything else.**

Rationale:
- Loom defines its own doc tree. Anything outside `loom/` is by definition not a Loom doc.
- Allowlist is safer than denylist: a denylist needs to grow every time a new "stray .md" pattern appears (`docs/`, `node_modules/`, `.cursor/`, `.archive/` outside loom, vendored READMEs in `packages/`...). An allowlist is one rule that never grows.
- The cost is zero — no Loom workflow ever needs to address a doc outside `loom/`.

**One subtlety: `loom/.archive/`.** Archived docs are still Loom docs. They must remain resolvable by id (so unarchive / cross-reference still works). The scope rule is `loom/**` *including* `.archive/` subtrees; only files outside `loom/` are excluded.

**Implementation sketch:**
- In whatever function walks the filesystem to populate the link index (likely `buildLinkIndex` in `fs/repositories/linkRepository.ts`), replace any `glob('**/*.md')` or `walkDir(workspaceRoot)` with a path anchored on `${workspaceRoot}/loom/`.
- Anchor on `getActiveLoomRoot()` (the Loom root) + `'/loom/'`, never substring-match `/loom/` in absolute paths. The repo path itself contains `loom` in this project; substring matching breaks (lesson from this session's hook script bug).

### 2. Ambiguity — what happens when two docs match?

**Recommendation: fail loudly with a `MultipleDocsFoundError` that lists both candidates.**

Three options considered:

| Option | Pros | Cons |
|---|---|---|
| **A. Fail loud** (recommended) | Safe by default. Forces explicit choice. Catches genuine bugs (duplicate `id:` frontmatter, name collisions). | Slightly less ergonomic — the AI/user has to disambiguate. |
| B. Precedence order | Friendlier. "Always prefer the live doc over the archived one." | Hides bugs. The duplicate id stays silently wrong. The precedence rule is a new piece of state to remember. |
| C. Warn + pick first | Worst of both worlds: silent in tool output, loud in logs nobody reads. |

Loud failure is consistent with Loom's broader stance: surface problems, never paper over them. The error message should name both paths so the next call can be more specific (e.g. by introducing a path-based addressing in a follow-up idea).

**Implementation sketch:**
- The link index is currently `Map<DocId, DocPath>`. Change to `Map<DocId, DocPath[]>` internally; the resolver public API returns the single path if `length === 1`, throws `MultipleDocsFoundError(id, candidates: DocPath[])` otherwise.
- All call sites of the resolver wrap the throw, surface a clear MCP tool error, and don't mutate any state.

## Two-step implementation plan (rough)

This is the design's recommended split — the actual plan doc will be a separate doc.

**Step 1 — Scope.** Restrict link index walk + `findDoc` to `loom/**`. Add unit test that places a `.md` file outside `loom/` with a colliding id and proves it's ignored. Test must use a workspace root whose absolute path contains the substring `loom` (mimics this repo).

**Step 2 — Ambiguity.** Track all matches; throw on `length > 1`. Add unit test that places two `loom/.../foo-idea.md` files with `id: foo` and proves the throw. Update all id-keyed MCP tools to surface the multi-match error cleanly (no swallowing).

Both steps land independently — Step 1 alone removes the practical risk for this codebase (the only observed collision was a backup outside `loom/`). Step 2 is the durable fix.

## Risks and edge cases

- **Existing duplicate ids inside `loom/`.** After Step 1, if any two docs inside `loom/**` share an id, every operation on that id starts throwing. Need a one-time scan during the design->implementation transition: enumerate all duplicates in this repo, fix them by renaming or merging, only then ship Step 2. Otherwise we ship a regression.
- **Renames-in-flight.** During a `loom_rename`, the source and destination briefly look like two docs with the same id (or two docs with overlapping ids). The resolver fix must understand the rename semantics — likely by reading the index *before* the rename and writing *after*, never mid-flight.
- **`.archive/` collision potential.** The current `loom_archive` puts a doc at `loom/.../.archive/{id}.md`. If a future archive operation tries to archive a doc with id `X` and an archived `X` already exists, that's a collision the new resolver must handle. Recommend: archive renames to `{id}-{timestamp}.md` when a collision is detected, or fail loud and ask the user. Out of scope here but flag for the plan.
- **Performance.** The current walk is O(all .md files in workspace). After scope fix, it's O(all .md files in `loom/`). Should be faster, not slower. No perf risk.

## Connection to other ideas / threads

- **`.archive/` subdir taxonomy** (Rafa's 2026-05-05 thoughts: cancelled / chats / deferred / superseded). Implementation must keep working when archives nest deeper. The `loom/**` scope rule handles this for free.
- **Path-based MCP addressing** (deferred). If we ever add `loom_archive(path=...)` as an alternative to `id=...`, the ambiguity problem dissolves at the API level. The resolver fix is still the right thing to do — defense in depth.
- **`loom-install-claude-hook` deferred idea**: irrelevant to this fix, but shipping the gate to other workspaces makes the resolver bug more visible (more agents driven through MCP, more chances to trigger collisions). Fixing this before shipping the gate broadly is prudent ordering.

## Open questions

1. Confirm the canonical scope path: `${LOOM_ROOT}/loom/**` (where `LOOM_ROOT` is the workspace root). If `LOOM_ROOT` already points *inside* `loom/` somehow, the rule changes — verify with the actual `getActiveLoomRoot()` semantics.
2. Should the link index continue to expose paths to MCP resources (e.g. `loom://state` includes file paths)? If yes, those paths must remain workspace-relative (not absolute) to avoid leaking the `loom/` substring back into client logic.
3. After Step 1, is it worth surfacing a CLI command (`loom doctor` or similar) to detect duplicate ids inside `loom/**`? Useful for the one-time pre-Step-2 scan, but new surface area. Probably yes, as a small `loom validate` extension.

## Decision log (this design conversation)

- 2026-05-05 — Allowlist `loom/**` over denylist. Rationale: rule never grows.
- 2026-05-05 — Fail loud on ambiguity over precedence order. Rationale: surface bugs, don't paper over.
- 2026-05-05 — Two-step split (scope, then ambiguity). Rationale: scope alone removes the observed risk; ambiguity is the durable fix and benefits from a one-time pre-scan.
