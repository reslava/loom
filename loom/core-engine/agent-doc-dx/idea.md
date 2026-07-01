---
type: idea
id: id_01KT2M4HTWB9Q66V82A6P790E8
title: "Agent doc-tooling DX: id/path transparency + create-doc-with-body"
status: done
created: "2026-06-01T00:00:00.000Z"
updated: 2026-06-02
version: 4
tags: []
parent_id: null
requires_load: []
---
# Agent doc-tooling DX: id/path transparency + create-doc-with-body

Two friction reducers for working with Loom docs from an **MCP/CLI agent session**
(e.g. Claude Code), surfaced in the global UX-reflection chat on 2026-06-01. Both
sharpen the *existing* MCP doc surface rather than adding new user-visible behavior.

## What

**Part 1 — id/path transparency + suggest-on-miss errors.**
- **Do not** add a stored id→path dictionary — a hand-/cache-maintained map silently
  desyncs on rename/move, exactly the drift Loom exists to kill. The resolution
  layer already exists and is filesystem-derived: `buildLinkIndex`,
  `loom://link-index`, `loom_find_doc`.
- **Expose the resolved path** from that index so the agent (and the tree) can see
  *where* a doc lives — an id is currently opaque to the agent until it acts on it.
- **Make lookup failures teach.** When a tool receives a wrong-but-close key — the
  concrete case: `loom_start_plan` given the *filename* `release-pipeline-plan-001`
  instead of the ULID `pl_01KT…` returned a bare "not found" — fuzzy-match the key
  against the index and suggest the correct id. One better error message removes
  most of the id-opacity friction with no new data structure.

**Part 2 — create-doc-with-body (collapse the two-step).**
- Today every doc is `loom_create_*` (writes a frontmatter shell) → `loom_update_doc`
  (writes the body). In Claude Code sessions the `loom_generate_*` sampling path is
  unavailable (the agent *is* the model), so `create_*` is only ever a stub the
  agent immediately fills — two MCP round-trips per doc.
- Add a one-call path: either `create_*` accepts an optional `body`, a new
  `create-doc-with-body`, or `loom_promote` accepts an inline body. (`loom_promote`
  and the extension's right-click chat→design/plan already exist — the gap is
  specifically the body-in-one-call on the MCP path the agent uses.)

## Why it matters

Both are repeated, per-operation taxes in agent-driven sessions specifically. Part 1's
opacity caused a real mis-call this session (filename vs ULID); Part 2's second call is
paid on *every* doc created. Neither blocks work, but they're the kind of steady friction
that compounds across a long session.

## Success criteria

- A tool given a wrong-but-close key returns an error that names the correct id.
- A doc's resolved path is visible in tool output / a resource field, so the agent can
  report where a doc lives.
- A single MCP call creates a doc with both frontmatter and body.

## Open questions for design

- **Part 1:** where does "expose path" live — add a `path` field to tool results, or to
  the `loom://link-index` resource, or a dedicated resolve tool? Which tools get
  suggest-on-miss (just the id-taking mutators, or all)?
- **Part 2:** new tool vs. optional `body` on `create_*` vs. body on `loom_promote`. How
  it interacts with `finalize` / auto-finalize.
- **Scope:** one thread → one plan covering both, or split into two plans
  (resolution-dx, create-with-body)? They're independent enough to ship separately.

## Provenance

Raised by Rafa in the global `loom`-weave reflection chat
(`loom/loom/global/chats/global-chat-001.md`).
