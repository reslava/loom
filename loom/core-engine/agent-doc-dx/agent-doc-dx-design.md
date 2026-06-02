---
type: design
id: de_01KT3FG3M865N54WBT3Z95T20Y
title: "Agent doc-tooling DX: id/path transparency + create-doc-with-body"
status: done
created: "2026-06-02T00:00:00.000Z"
updated: 2026-06-02
version: 4
tags: []
parent_id: id_01KT2M4HTWB9Q66V82A6P790E8
requires_load: []
---
# Agent doc-tooling DX: id/path transparency + create-doc-with-body

How we sharpen the existing MCP doc surface to remove two per-operation taxes paid in
agent-driven (Claude Code) sessions. Both are refinements of code that already exists —
no new user-visible behaviour. Findings below are verified against `packages/mcp`,
`packages/fs`, and `packages/app` source, not the design doc.

## Goal

1. An agent can see *where* a doc lives and recover from a wrong-but-close id without a
   guess-and-retry loop.
2. An agent can create a doc with its body in a single MCP call, and can `promote` in a
   Claude Code session at all.

## Two parts → two plans

The work splits cleanly along the read/resolve vs. write axis and ships as two
independent plans: **`resolution-dx`** (Part 1) and **`create-with-body`** (Part 2).

---

## Part 1 — resolution-dx

### Findings (verified)

- **`loom_find_doc` already returns the path.** `findDoc.ts` resolves id → `{ id, filePath }`.
  No new resolve tool is needed; the path is already exposed there. Remaining gaps: the
  agent must know to call it, and it is one round-trip per id.
- **`loom://link-index` is broken.** `linkIndex.ts` resource does
  `JSON.stringify(buildLinkIndex(...), null, 2)`, but every field of `LinkIndex` is a
  `Map` (`byId`, `documents`, `bySlug`, `backlinks`, `children`, `parent`, `stepBlockers`).
  `JSON.stringify` of a `Map` yields `{}`, so the resource currently emits all-empty
  objects. The id→path data already exists in the index (`byId: id→path`,
  `documents: id→{ path, type, archived, threadId }`) but never reaches the wire.
- **Suggest-on-miss does not exist.** `findDocumentById` (in `fs/utils/pathUtils.ts`) is
  the single resolver that `find_doc`, `update_doc`, `promote`, and `resolveWeaveIdForPlan`
  all funnel through. It returns `null`; callers throw bare `"... not found"`.
- **`findDocumentById` re-walks the filesystem and parses frontmatter on every call**
  (`findMarkdownFiles` + `readFrontmatterId` per file). N reads per lookup.

### Design

1. **Fix `loom://link-index` serialization.** In the resource handler, convert the Maps to
   plain JSON before stringifying (objects keyed by id, or arrays of entries). This single
   fix exposes the entire id→path map at once — strictly better than `find_doc`
   one-at-a-time. Path exposure is therefore solved here, not by changing tool result
   shapes.
2. **Centralise suggest-on-miss at the chokepoint.** Add a `resolveDocIdOrThrow` helper that
   wraps id resolution: on miss, fuzzy-match the key against the index's `byId` keys
   (and `bySlug`) and throw `not found: X — did you mean Y?`. Route the id-taking mutators
   through it so every tool inherits the better error — do not patch each tool separately.
   - **Candidate set comes from the cached link index keys**, not a fresh FS walk. The
     suggestion path must not multiply the existing N-reads-per-lookup cost.

### Open question for the plan

- **Plan-id canonical form.** The idea reports the mis-call as filename
  `release-pipeline-plan-001` vs. ULID `pl_01KT…`, but `startPlan`'s description and
  `pathUtils` treat plan ids as semantic `{thread}-plan-NNN`. Confirm which form is
  canonical so the suggestion points at the right id.

---

## Part 2 — create-with-body

### Findings (verified)

- `loom_create_idea` / `loom_create_design`: take title only; body is a generated stub
  (`generateIdeaBody`). No body argument.
- `loom_create_plan`: builds a body from `goal` + `steps[]`; no free-form body.
- `loom_update_doc`: the mandatory second call carrying `content`, and it **bumps version
  to 2** every time.
- `loom_create_reference`: already writes `status: active` with a body placeholder and a
  `slug`.
- **`loom_promote` is dead in Claude Code.** `promote.ts` routes through
  `samplingAiClient(server)` (server→client sampling), which Claude Code blocks
  (`MethodNotFound`). The agent cannot promote chat→idea/design/plan in a CC session today.

### Design

1. **Optional `body` / `content` on `create_*`.** Thread an optional `content` through
   `weaveIdea` / `weaveDesign` / `weavePlan` (and `create_reference`); when provided, it
   replaces the generated stub. One code path, no new tool. Bonus: the doc is born at
   **version 1 with real content** instead of v1-stub → v2-body — cleaner history and one
   fewer round-trip.
2. **Optional `body` on `loom_promote` (sampling-free path).** When `body` is supplied,
   skip sampling and write it directly. This is the higher-priority half: it does not just
   save a round-trip, it makes `promote` usable in Claude Code for the first time.
3. **Do not auto-finalize.** Body-on-create stays `status: draft`. `draft → active` is the
   deliberate human review gate (Finalize/Start). Collapse the *content* round-trip, not the
   approval gate. A one-call "create active doc" would be a separate explicit `finalize:
   true` opt-in — recommended against for ideas/designs. `create_reference` is the natural
   exception (already born `active`, no gate).

---

## Decisions

| Decision | Choice | Rationale |
|----------|--------|-----------|
| Expose path | Fix `loom://link-index` serialization | Path data already in the index; one fix exposes the whole map. No new tool; `find_doc` already covers single lookups. |
| Suggest-on-miss location | `resolveDocIdOrThrow` helper at `findDocumentById` chokepoint | Single resolver; every id-taking tool inherits it. Fix the cause, not each symptom. |
| Suggest-on-miss candidate set | Cached link-index keys | Avoids multiplying the existing N-reads-per-lookup FS cost. |
| Create-with-body shape | Optional `body`/`content` on `create_*` | Smallest change, one code path, kills the v2 version artifact. |
| Promote-with-body | Optional `body` on `loom_promote`, skip sampling when present | Unblocks the only promote path available in Claude Code. |
| Finalize interaction | Stay `draft`; no auto-finalize | Preserves the human review gate; collapse content round-trip only. |

## Open questions for the plan

- Plan-id canonical form (see Part 1).
- Exact serialized shape of `loom://link-index` (id-keyed objects vs. entry arrays) — pick
  the shape that is most directly consumable by both the agent and the tree view.
- Fuzzy-match algorithm for suggest-on-miss (Levenshtein vs. substring/prefix) and how many
  candidates to surface.

## Scope / sequencing

Two plans, disjoint code:

- **`resolution-dx`** — fs/resource layer: link-index serialization fix, `resolveDocIdOrThrow`
  suggest-on-miss helper.
- **`create-with-body`** — app/MCP write layer: optional body on `create_*` + `loom_promote`.

Suggested order: link-index serialization fix first (live bug returning empty data) →
`promote` + body (unblocks a dead path) → rest of create-with-body (pure DX).
