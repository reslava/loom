---
type: req
id: rq_01KTCWA9S049W8ZXMJ7VFRJ99R
title: Requirements-Driven Development — Requirements
status: locked
created: 2026-06-05
updated: 2026-06-12
version: 2
design_version: 2
tags: []
parent_id: de_01KTBA3MSAGGDWC5G55A49JN4T
requires_load: []
---
# Requirements-Driven Development — Requirements

### ✅ Included
- `IN1` A dedicated `req` doc-type — one flat `req.md` per thread, body = three ID'd lists, single stem (`type: req` + `req.md`) like `ctx`.
- `IN2` Three immutable lists — `✅ Included` / `❌ Excluded` / `⛓ Constraints` — each item carrying a stable `IN`/`EX`/`C` id, parsed by a pure `parseReq`.
- `IN3` `req` is born **first** in the chain (chat → req → idea → design → plan) **and** always-loaded — injected into every thread context bundle before the parent chain.
- `IN4` Lifecycle: generate-from-chat extraction → user curates → explicit `finalize` lock → refine/reopen at version+1.
- `IN5` Planner-citation contract — plan steps carry a `satisfies` column; the planner cites requirements as it generates (prevention over detection).
- `IN6` Pure structural coverage reducer (`checkReqCoverage`, deterministic, runs always): every Included id has ≥1 covering step; no step cites an Excluded id.
- `IN7` Semantic backstop — an AI judgment pass for phrased-differently violations of an Excluded/Constraint item.
- `IN8` `req_version` staleness propagation — re-locking marks downstream idea/design/plan stale via the existing machinery.
- `IN9` Wired across all four layers: core, app, mcp, and the VS Code extension (tree node + Generate/Refine/Finalize buttons).
- `IN10` Requirement handles are immutable for the life of a thread — append-only: an existing `IN`/`EX`/`C` id is never renumbered, reused, or deleted; enforced by a pure guard (`diffReqHandles`) that refuses any amend which drops or renumbers a handle (new ids may only be appended).
- `IN11` A `~dropped` marker retires a superseded Included item — the handle stays present and citation-resolvable but is exempt from coverage nagging; a still-uncovered (deferred) item needs no marker and keeps surfacing in `verify`.
- `IN12` The `req` evolve-path is `loom_amend_req` (reconcile new/changed requirements under append-only rules, re-open locked → draft, bump version → downstream stale), replacing `refine` for the `req` doc-type.

### ❌ Excluded
- `EX1` **Generator policy** — no step-count rule, no banned-step list hardcoded into the generic plan generator. Constraints come from the user's spec, never from generator policy.
- `EX2` **Design Choices in `req`** — mutable (User/AI authority); they live in `design.md`, never the locked anchor.
- `EX3` **Open Questions in `req`** — unresolved by nature; they live in the idea or chat. (Putting them in the locked, always-loaded, planner-cited doc re-exposes the exact failure this thread exists to kill.)
- `EX4` **Functional / runtime correctness** — verification checks scope traceability through the doc graph, NOT whether the built code actually works.
- `EX5` **Weave-root / loose-fiber `req` variant** — `req` is thread-scoped only; pre-thread constraints live in chat, extracted at thread formation.
- `EX6` **Bulk migration sweep** of existing idea/design scope prose — opt-in extract only; legacy prose references `req`, never the reverse.
- `EX7` **Frontmatter as source of truth** — req items live in the markdown body, not a frontmatter array.

### ⛓ Constraints
- `C1` TypeScript only; obey the layering `cli/vscode/mcp → app → core + fs` — layers never import upward.
- `C2` Reducers stay pure — `parseReq` and `checkReqCoverage` perform no IO and no side effects.
- `C3` All writes to `loom/**/*.md` go through MCP tools.
- `C4` Semantic verifier respects the sampling boundary — sampling path in the extension, agent-as-verifier in a Claude Code CLI session (server→client sampling is blocked there).
- `C5` Re-openable immutability — the lock prevents silent drift, not change; re-open bumps `version` and rides the existing refine/staleness machinery (no new enforcement concept).