---
type: reference
id: rf_01KTBR5N9P3Q6R8S2T5V7W9XYZ
title: "loom — Requirements Model"
status: active
created: 2026-06-05
version: 1
tags: [reference, public, requirements, context, workflow]
parent_id: null
requires_load: []
slug: loom-requirements-reference
description: "The req doc-type and the requirements model: include / exclude / constraints as a thread's locked, always-loaded authoritative scope spec, and how it propagates and is verified through the workflow."
load: by-request
load_when: [design, plan]
---

# loom — Requirements Model

Loom lets a user declare, in a structured and durable way, what a thread's work
must **include**, **exclude**, and be **constrained** by — and guarantees those
requirements are carried faithfully through every promotion
(`chat → req → idea → design → plan → done`). The artifact is the **`req` doc**:
one per thread, locked once approved, and auto-loaded into every downstream action
so the spec frames everything built after it.

The generator's job is **faithful translation of the spec, never imposition of
policy.** It must carry every user-stated inclusion / exclusion / constraint
through each stage without dropping them, and must not invent scope the spec does
not contain.

---

## Why it exists

User-stated scope does not survive a chat-driven workflow on its own. Without a
durable anchor, two failure modes recur:

- **Constraints get dropped on promotion.** An exclusion stated in a chat opener
  ("no interaction testing") is silently lost when the work is promoted to design,
  so the planner — working from a design that no longer holds the exclusion —
  emits a step the user explicitly ruled out.
- **Scope gets invented.** An *Open Question* in a design is treated as a
  deliverable and turned into a plan step that was never asked for.

The wrong fix is hardcoding preferences into the generator prompt ("never emit a
smoke-test step", "fewest steps"). That fights any user whose legitimate intent
differs. Constraints must come from the **user's spec**, not generator policy. The
`req` doc is that spec.

---

## The `req` doc

**File:** `loom/{weave}/{thread}/req.md` — flat, single stem (`type: req` +
`req.md`), exactly like `ctx` / `ctx.md`. One per thread.

**Status:** `draft | locked`. No new positional frontmatter fields — scope is
positional (thread), as everywhere in Loom.

**The body is the source of truth** (deliberately the opposite of plan-steps,
whose canonical state is a frontmatter array). `req` is an *authored authoritative
spec*, not a regenerable view, so its markdown body is canonical. It holds three
immutable, ID'd lists:

```markdown
### ✅ Included
- `IN1` User registration with email/password.
- `IN2` Login flow with session management.

### ❌ Excluded
- `EX1` **Interaction testing** — no manual smoke-test steps.
- `EX2` **Social login** — Google/Facebook auth (Phase 2).

### ⛓ Constraints
- `C1` TypeScript only — no new runtime dependency.
- `C2` Must run offline.
```

The handles (`IN`/`EX`/`C` + ordinal) are inline-code prefixes. A **pure parser in
`packages/core`** (`parseReq(body) → { included, excluded, constraints }`, each
`{ id, text }[]`) extracts them. The entity is
`ReqDoc extends BaseDoc<ReqStatus>` (`packages/core/src/entities/req.ts`);
`ReqStatus = 'draft' | 'locked'`.

### What belongs in `req` — and what does not

The sorting rule is one question: **"can a later design change it?"** Only sections
whose answer is **No** belong in the locked `req`.

| Section | Authority | Lives in | Why |
|---------|-----------|----------|-----|
| **Included** | user | `req.md` | scope in — immutable |
| **Excluded** | user | `req.md` | scope out — immutable |
| **Constraints** | user / environment | `req.md` | hard boundaries — immutable |
| **Design choices** | user / AI | `design.md` | mutable — a locked anchor must not hold mutable content |
| **Open questions** | — | idea / chat | never in `req` — treating an open question as authoritative is the exact failure `req` exists to prevent |

`req` is the **single authoritative scope surface.** The idea body is narrative
that may *reference* `req` but never restates it.

---

## Position & always-load

`req` is dual-natured:

- **Born first.** It is the first formal artifact, extracted from the chat opener
  before the idea, so every later node is built against a locked spec instead of
  re-deriving it: `chat → req → idea → design → plan → done`.
- **Cross-cutting always-loaded.** Thereafter it is injected into the context
  bundle for every doc in its thread, ordered **before** idea / design / plan so
  the spec frames everything after it (`assembleContext`,
  `packages/app/src/context/assembleContext.ts`).

This fills the thread-scope slot that `ctx` intentionally leaves empty — ctx is
**global + weave only** (a thread's idea/design/plan load in full via the parent
chain). `req` occupies the thread-scope always-loaded position, but with
**authoritative-spec** semantics instead of **regenerable-summary** semantics. No
new concept — `loadThread` reads `req.md` into `Thread.req`; `buildCatalog`
registers it at `scope: 'thread'` so it is resolvable and citable.

A perpetual `req` must not block a thread reaching `DONE` — `type === 'req'` is
excluded from the every-doc-done predicate in `getThreadStatus` /
`getWeaveStatus`, like ctx and reference docs.

---

## Lifecycle

```
{generate req from chat} → draft → {user curates: add/delete/edit} → {finalize} → locked
                                                                          ↑            │
                                                          re-lock (version+1)   {reopen/edit}
                                                                          └────────────┘
```

- **Generate** reads the chat (the opener especially) and extracts the explicit
  includes / excludes / constraints → `status: draft`. This is *constrained
  extraction* — the safe kind of generation, not the high-risk design→plan
  invention.
- **Curate** — the user edits the lists. The human approves; the AI proposes.
- **Finalize** — an **explicit** `draft → locked` action with a visible button.
  The lock is the whole point of the anchor, so it is deliberate, never a silent
  flip on first downstream use.
- **Re-open** — editing a locked `req` returns it to `draft`; the next finalize
  re-locks at **version + 1**, which marks downstream idea / design / plan stale
  via the existing staleness machinery.

**Immutability means "can't silently drift", not "frozen forever."** Changing
scope is a deliberate version bump with visible downstream consequences.

---

## Verification

Verification checks **scope traceability through the doc graph** — that the plan
covers what was asked and avoids what was excluded. It does **not** check the
functional correctness of the built code. Three layers, prevention-first:

1. **Planner citation (prevention).** `PlanStep` carries `satisfies: string[]` —
   the `Included` / `Constraint` IDs a step advances. The planner is handed the
   `Excluded` / `Constraints` lists as hard boundaries and emits `satisfies` as it
   generates, so most violations never occur.
2. **Structural check (pure, core, always).** A deterministic reducer over the
   parsed `req` and the plan steps: every `Included` ID has ≥1 covering step; no
   step cites an `Excluded` ID; constraints carry through. Surfaced as a diagnostic
   alongside stale / blocked-step. No AI.
3. **Semantic backstop (AI).** "Did a step violate `EX1` / `C2` phrased
   differently?" — runs as a **sampling** diagnostic in the VS Code extension; in a
   Claude Code CLI session the agent verifies directly (server→client sampling is
   blocked there). Two delivery paths, same logic — exactly like `generate`.
4. **`req_version` staleness.** Downstream docs record the `req_version` they were
   built against (parallel to plan `design_version`); a re-locked `req` marks them
   stale.

Prevention beats detection: with the planner citing as it generates, most
verification collapses into the cheap structural check, and the AI pass is a
backstop rather than the primary gate.

---

## MCP surface

Mirrors the idea / design pattern:

| Tool | Purpose |
|------|---------|
| `loom_create_req(weaveId, threadId, content?)` | Create the `req` doc (pass `content` to author it in one call) |
| `loom_generate_req` | Extension sampling path; a CLI agent calls `loom_create_req` with `content` instead |
| `loom_refine_req` | Re-extract on chat change → `draft`, version bump |
| `loom_finalize_req` | `draft → locked` |
| `loom_verify_req` | Run the structural (and, where available, semantic) scope check |

`req` joins the `loom://context/...` bundle automatically (always-loaded at thread
scope). The structural coverage check is exposed through the diagnostics resource.

---

## Relation to `ctx` and `reference`

| Doc type | Loaded | Semantics | Source of truth |
|----------|--------|-----------|-----------------|
| `ctx` | by scope (global + weave) | regenerable AI summary | derivable; safe to rewrite |
| `req` | by scope (thread) | **authoritative spec** | authored; changes only via deliberate re-lock |
| `reference` | by `requires_load` / `load_when` | static architectural fact | hand-maintained |

`req` looks ctx-like in *how* it loads but is the opposite in *what* it means: a
ctx may be regenerated at will, a `req` is the locked record of user intent.
